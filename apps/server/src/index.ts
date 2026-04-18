import 'dotenv/config';
import { app } from './app';
import { bootstrapAdmin } from './lib/bootstrap-admin';

const PORT = process.env.PORT || 3000;

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} (all interfaces)`);
  bootstrapAdmin();
});
