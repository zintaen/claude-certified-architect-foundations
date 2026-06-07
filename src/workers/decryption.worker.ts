self.onmessage = function (e) {
  const { encQuestions } = e.data;
  if (!encQuestions) {
    self.postMessage({ error: 'No payload provided' });
    return;
  }

  try {
    const b64 = encQuestions;
    const decoded = decodeURIComponent(escape(atob(b64)));
    const localQuestions = JSON.parse(decoded);

    self.postMessage({ success: true, questions: localQuestions });
  } catch (err) {
    self.postMessage({ error: err.message });
  }
};
