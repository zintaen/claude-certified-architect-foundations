-- SQL Data Cleanup Script for CCAF Mock Exam
-- Execute this script in your Supabase SQL Editor.

-- 1. DELETE JUNK DATA
-- Delete "Quick Abandons": Score < 100 and Time < 5 minutes
DELETE FROM mock_results
WHERE score < 100 AND time_taken_seconds < 300;

-- Delete "Timeouts": Score = 0 and Time >= 120 minutes (7200s)
DELETE FROM mock_results
WHERE score = 0 AND time_taken_seconds >= 7200;

-- 2. UPDATE GET_GLOBAL_STATS RPC
-- Recreate the get_global_stats function to automatically ignore
-- 0-score attempts where the user completed the exam suspiciously fast,
-- ensuring future anomalies don't pollute the stats if they bypass the frontend guard.

DROP FUNCTION IF EXISTS get_global_stats();

CREATE OR REPLACE FUNCTION get_global_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total INT;
  v_avg FLOAT;
  v_pass_count INT;
  v_hardest json;
  v_leaderboard json;
BEGIN
  -- Count total valid exams
  SELECT COUNT(*) INTO v_total
  FROM mock_results
  WHERE NOT (score = 0 AND time_taken_seconds < 300)
    AND NOT (score = 0 AND time_taken_seconds >= 7200);

  IF v_total = 0 THEN
    RETURN json_build_object(
      'total_exams', 0,
      'avg_score', 0,
      'pass_rate', 0,
      'hardest_questions', '[]'::json
    );
  END IF;

  -- Calculate avg score and passing count from valid exams
  SELECT 
    COALESCE(AVG(score), 0),
    COUNT(*) FILTER (WHERE score >= 700)
  INTO v_avg, v_pass_count
  FROM mock_results
  WHERE NOT (score = 0 AND time_taken_seconds < 300)
    AND NOT (score = 0 AND time_taken_seconds >= 7200);

  -- Calculate hardest questions, excluding junk rows
  WITH all_wrong AS (
    SELECT jsonb_array_elements(wrong_answers::jsonb) AS q_id
    FROM mock_results
    WHERE wrong_answers IS NOT NULL
      AND jsonb_typeof(wrong_answers::jsonb) = 'array'
      AND NOT (score = 0 AND time_taken_seconds < 300)
      AND NOT (score = 0 AND time_taken_seconds >= 7200)
  ),
  miss_counts AS (
    SELECT q_id::text::int AS index, COUNT(*) AS misses
    FROM all_wrong
    GROUP BY q_id
    ORDER BY misses DESC
    LIMIT 5
  )
  SELECT COALESCE(json_agg(json_build_object('index', index, 'misses', misses)), '[]'::json)
  INTO v_hardest
  FROM miss_counts;
  -- Calculate leaderboard (top 3 max scores by nickname)
  WITH ranked AS (
    SELECT u.nickname, MAX(r.score) as max_score
    FROM mock_results r
    JOIN mock_users u ON r.user_id = u.id
    WHERE u.nickname IS NOT NULL AND u.nickname != ''
      AND NOT (r.score = 0 AND r.time_taken_seconds < 300)
      AND NOT (r.score = 0 AND r.time_taken_seconds >= 7200)
    GROUP BY u.nickname
    ORDER BY max_score DESC
    LIMIT 3
  )
  SELECT COALESCE(json_agg(json_build_object('nickname', nickname, 'score', max_score)), '[]'::json)
  INTO v_leaderboard
  FROM ranked;

  RETURN json_build_object(
    'total_exams', v_total,
    'avg_score', ROUND(v_avg::numeric),
    'pass_rate', ROUND((v_pass_count::numeric / v_total::numeric) * 100),
    'hardest_questions', v_hardest,
    'leaderboard', v_leaderboard
  );
END;
$$;
