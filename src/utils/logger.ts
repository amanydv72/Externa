import pino from 'pino';
import { environment } from '../config/environment';

export const logger = pino({
  level: environment.logging.level,
  transport: environment.logging.prettyPrint
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});

export default logger;
