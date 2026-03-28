import express from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/error-handler';
import { authRouter } from './routes/auth';
import { visitsRouter } from './routes/visits';
import { reviewsRouter } from './routes/reviews';
import { moviesRouter } from './routes/movies';
import { cinemasRouter } from './routes/cinemas';
import { syncRouter } from './routes/sync';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRouter);
app.use('/api/visits', visitsRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/movies', moviesRouter);
app.use('/api/cinemas', cinemasRouter);
app.use('/api/sync', syncRouter);

app.use(errorHandler);

export { app };
