import { randomUUID } from 'node:crypto';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import fastify, { type FastifyInstance } from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import type { Env } from './env.ts';
import { type Authenticate, buildAuthenticate } from './plugins/auth.ts';
import { registerDocs } from './plugins/docs.ts';
import { registerErrorHandling } from './plugins/error-handler.ts';
import { registerMetrics } from './plugins/metrics.ts';
import { InMemoryConfigRepository } from './repositories/config-repo.ts';
import { InMemoryDeviceRepository } from './repositories/device-repo.ts';
import { InMemoryLogRepository } from './repositories/log-repo.ts';
import { InMemoryProfileRepository } from './repositories/profile-repo.ts';
import { InMemoryRoutineRepository } from './repositories/routine-repo.ts';
import { registerBackupRoutes } from './routes/backup.ts';
import { registerChatRoutes } from './routes/chat.ts';
import { registerConfigRoutes } from './routes/config.ts';
import { registerDeviceRoutes } from './routes/devices.ts';
import { registerHealthRoutes } from './routes/health.ts';
import { registerInternetRoutes } from './routes/internet.ts';
import { registerLogRoutes } from './routes/logs.ts';
import { registerProfileRoutes } from './routes/profiles.ts';
import { registerRoutineRoutes } from './routes/routines.ts';
import { registerStatusRoutes } from './routes/status.ts';
import type { Device } from './schemas/device.ts';
import { BackupService } from './services/backup-service.ts';
import { ChatService } from './services/chat-service.ts';
import { MockCloudLlmClient } from './services/cloud-llm-client.ts';
import { ConfigService } from './services/config-service.ts';
import { DeviceService } from './services/device-service.ts';
import { InternetPermissionService } from './services/internet-permission-service.ts';
import { LogService } from './services/log-service.ts';
import { PrivacyService } from './services/privacy-service.ts';
import { ProfileService } from './services/profile-service.ts';
import { RoutineEngineService } from './services/routine-engine-service.ts';
import { RoutineService } from './services/routine-service.ts';
import { StatusService } from './services/status-service.ts';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: Authenticate;
  }
}

export interface BuildAppOptions {
  env: Env;
  logger?: boolean;
  beforeReady?: (app: FastifyInstance) => void;
  /** Seed devices into the in-memory store (tests / local demos). */
  seedDevices?: Device[];
}

export async function buildApp({
  env,
  logger = true,
  beforeReady,
  seedDevices,
}: BuildAppOptions): Promise<FastifyInstance> {
  const app = fastify({
    logger: logger
      ? {
          level: env.LOG_LEVEL,
          redact: ['req.headers.authorization'],
        }
      : false,
    requestIdHeader: 'x-request-id',
    genReqId: () => randomUUID(),
    disableRequestLogging: env.NODE_ENV === 'test',
    forceCloseConnections: false,
    bodyLimit: env.BODY_LIMIT_BYTES,
    requestTimeout: env.REQUEST_TIMEOUT_MS,
  });

  let idleReaper: NodeJS.Timeout | undefined;
  app.addHook('preClose', async () => {
    idleReaper = setInterval(() => app.server.closeIdleConnections(), 250);
    idleReaper.unref();
  });
  app.addHook('onClose', async () => {
    if (idleReaper) {
      clearInterval(idleReaper);
    }
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(helmet, { contentSecurityPolicy: env.APP_ENV === 'production' });

  await app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX_PER_MINUTE,
    timeWindow: '1 minute',
  });

  app.decorate('authenticate', buildAuthenticate(env.API_TOKEN));

  app.addHook('onRequest', async (request, reply) => {
    reply.header('x-request-id', request.id);
  });

  registerErrorHandling(app);
  registerMetrics(app);
  await registerDocs(app, env);

  const configRepo = new InMemoryConfigRepository();
  const deviceRepo = new InMemoryDeviceRepository();
  const profileRepo = new InMemoryProfileRepository();
  const routineRepo = new InMemoryRoutineRepository();
  const logRepo = new InMemoryLogRepository();

  if (seedDevices) {
    for (const device of seedDevices) {
      await deviceRepo.upsert(device);
    }
  }

  const configService = new ConfigService(configRepo);
  const deviceService = new DeviceService(deviceRepo);
  const profileService = new ProfileService(profileRepo);
  const routineService = new RoutineService(routineRepo);
  const logService = new LogService(logRepo);
  const statusService = new StatusService(configRepo, deviceRepo, profileRepo);
  const privacyService = new PrivacyService(configRepo, profileRepo);
  const internetPermission = new InternetPermissionService(configRepo, profileRepo);
  const cloudLlm = new MockCloudLlmClient();
  const routineEngine = new RoutineEngineService(routineService, deviceService, logService);
  const backupService = new BackupService();
  const chatService = new ChatService(logService, privacyService, profileService, internetPermission, cloudLlm);

  registerHealthRoutes(app);
  registerStatusRoutes(app, statusService);
  registerConfigRoutes(app, configService);
  registerDeviceRoutes(app, deviceService);
  registerProfileRoutes(app, profileService);
  registerRoutineRoutes(app, routineService, routineEngine);
  registerLogRoutes(app, logService);
  registerBackupRoutes(app, backupService);
  registerChatRoutes(app, chatService);
  registerInternetRoutes(app, internetPermission);

  beforeReady?.(app);

  await app.ready();
  return app;
}
