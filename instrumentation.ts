import { registerOTel } from '@vercel/otel';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';

const SUPERLOG_ENDPOINT = 'https://intake.superlog.sh';
const SUPERLOG_PUBLIC_TOKEN = 'sl_public_J2phoiOqlazsZdAYUAh_pt9ZDUgRuXs-kOlgB18Z1Fg';

function superlogHeaders(token: string): Record<string, string> {
  return { 'x-api-key': token };
}

export function register() {
  try {
    registerOTel({
      serviceName: 'ccaf-mock-exam',
      traceExporter: new OTLPTraceExporter({
        url: `${SUPERLOG_ENDPOINT}/v1/traces`,
        headers: superlogHeaders(SUPERLOG_PUBLIC_TOKEN),
      }),
      logRecordProcessors: [
        new BatchLogRecordProcessor(
          new OTLPLogExporter({
            url: `${SUPERLOG_ENDPOINT}/v1/logs`,
            headers: superlogHeaders(SUPERLOG_PUBLIC_TOKEN),
          })
        ),
      ],
      metricReaders: [
        new PeriodicExportingMetricReader({
          exporter: new OTLPMetricExporter({
            url: `${SUPERLOG_ENDPOINT}/v1/metrics`,
            headers: superlogHeaders(SUPERLOG_PUBLIC_TOKEN),
          }),
        }),
      ],
    });
  } catch (err) {
    // Keep the app available if the OTel SDK/version combo fails to boot (local/dev).
    console.warn('[otel] register() failed — continuing without exporters', err);
  }
}
