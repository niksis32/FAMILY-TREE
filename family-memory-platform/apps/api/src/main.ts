import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { API_PREFIX } from '@family/shared';
import { AppModule } from './app.module';

/**
 * API entry point — modular monolith.
 * Global prefix: /api/v1 (see @family/shared API_PREFIX)
 */
function parseCorsOrigins(): string[] {
  const raw = process.env.CORS_ORIGINS ?? process.env.APP_URL ?? 'http://localhost:3000';
  return raw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Dev (variant A/B in DOCKER_LOCAL_WINDOWS.md): web :3000 → API :4000 — browser requires CORS.
  app.enableCors({
    origin: parseCorsOrigins(),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.setGlobalPrefix(API_PREFIX.replace(/^\//, ''));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Family Memory Platform API')
    .setDescription('MVP — genealogy, media, timeline, sources')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));

  const port = process.env.API_PORT || 4000;
  await app.listen(port);
  console.log(`API listening on http://localhost:${port}${API_PREFIX}`);
}

bootstrap();
