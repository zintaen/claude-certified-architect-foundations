import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { LoggerProvider, BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { registerInstrumentations } from '@opentelemetry/instrumentation';

const PUBLIC_TOKEN = 'sl_public_J2phoiOqlazsZdAYUAh_pt9ZDUgRuXs-kOlgB18Z1Fg';
const ENDPOINT = 'https://intake.superlog.sh';

function superlogHeaders(token: string): Record<string, string> {
  return { 'x-api-key': token };
}

const headers = superlogHeaders(PUBLIC_TOKEN);

const resource = resourceFromAttributes({
  [SemanticResourceAttributes.SERVICE_NAME]: 'ccaf-frontend',
  [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
  [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: 'production',
  'vcs.repository.url.full': 'https://github.com/zintaen/claude-certified-architect-mock-exam.git',
});

// Traces
const traceExporter = new OTLPTraceExporter({
  url: `${ENDPOINT}/v1/traces`,
  headers,
});

const provider = new WebTracerProvider({
  resource,
  spanProcessors: [new BatchSpanProcessor(traceExporter)],
});
provider.register();

registerInstrumentations({
  instrumentations: [
    getWebAutoInstrumentations({
      '@opentelemetry/instrumentation-document-load': {},
      '@opentelemetry/instrumentation-fetch': {},
      '@opentelemetry/instrumentation-user-interaction': {},
      '@opentelemetry/instrumentation-xml-http-request': {},
    }),
  ],
});

// Metrics
const metricExporter = new OTLPMetricExporter({
  url: `${ENDPOINT}/v1/metrics`,
  headers,
});
const meterProvider = new MeterProvider({
  resource,
  readers: [
    new PeriodicExportingMetricReader({
      exporter: metricExporter,
      exportIntervalMillis: 10000,
    }),
  ],
});

// Logs
const logExporter = new OTLPLogExporter({
  url: `${ENDPOINT}/v1/logs`,
  headers,
});
const loggerProvider = new LoggerProvider({
  resource,
  logRecordProcessors: [new BatchLogRecordProcessor(logExporter)],
});

export const tracer = provider.getTracer('ccaf-frontend');
export const meter = meterProvider.getMeter('ccaf-frontend');
export const logger = loggerProvider.getLogger('ccaf-frontend');
