import { NestFactory } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { AppModule } from './app.module';
import { parseCorsOrigins } from './common/cors/cors.util';
import { SWAGGER_BEARER_AUTH } from './common/swagger/swagger.constants';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.useWebSocketAdapter(new IoAdapter(app));
  app.enableShutdownHooks();

  const configService = app.get(ConfigService);
  app.enableCors({
    origin: parseCorsOrigins(configService.get<string>('CORS_ORIGIN')),
    credentials: true,
  });
  const port = configService.get<number>('PORT', 3000);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Campus To-Do API')
    .setDescription('REST API for task management with JWT authentication')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT access token from /auth/register or /auth/login',
      },
      SWAGGER_BEARER_AUTH,
    )
    .build();

  const openApiDoc = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, cleanupOpenApiDoc(openApiDoc), {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(port);
}

void bootstrap();
