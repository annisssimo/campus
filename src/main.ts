import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc, ZodValidationPipe } from 'nestjs-zod';
import { AppModule } from './app.module';
import { SWAGGER_BEARER_AUTH } from './common/swagger/swagger.constants';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ZodValidationPipe());

  const configService = app.get(ConfigService);
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
  SwaggerModule.setup('api/docs', app, cleanupOpenApiDoc(openApiDoc));

  await app.listen(port);
}

void bootstrap();
