import 'dotenv/config';
import express from 'express';
import sunatRouter from './routers/sunatRouter.js'

const app = express();

app.use(express.json());

app.use("/sunat", sunatRouter);

app.listen(3000, ()=>console.log('servidor corriendo'))

