import express, { Express, Request, Response } from 'express';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';

const app: Express = express();
const port: string | number = 5000;

// __dirnameを置き換えるための設定
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.get('*', (req: Request, res: Response) => {
    res.send("nodejs server is running...")
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});