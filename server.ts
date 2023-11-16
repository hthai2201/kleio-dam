import express, { Request, Response } from "express";

import path from "path";
import { fileURLToPath } from "url";
import { DOWNLOAD_CONFIG } from "./constants.js";
import {
  chunkArray,
  delay,
  downloadFile,
  fetchFilesFromUrl,
} from "./utils/index.js";
import { DownloadResult } from "./types/index.js";

const app = express();
const port = 3000;

app.use(express.json());

app.post("/download", async (req: Request, res: Response) => {
  try {
    const { path: dataPath, baseUrl = DOWNLOAD_CONFIG.DEFAULT_BASE_URL } =
      req.body;

    if (!dataPath) {
      return res.status(400).json({ error: "Invalid request body" });
    }

    const filesToDownload = await fetchFilesFromUrl(`${baseUrl}${dataPath}`);
    if (!Array.isArray(filesToDownload) || filesToDownload.length === 0) {
      return res
        .status(400)
        .json({ error: "Invalid data from the specified URL" });
    }

    const results: DownloadResult[] = [];
    const chunks = chunkArray(filesToDownload, DOWNLOAD_CONFIG.ITEMS_PER_BATCH);
    for (const chunk of chunks) {
      try {
        const items = await Promise.all(
          chunk.map((item) => downloadFile(item, { baseUrl }))
        );
        results.push(...items);
        await delay(DOWNLOAD_CONFIG.DELAY);
        console.log("progress :>> ", results.length, filesToDownload.length);
      } catch (error) {
        results.push({
          success: false,
          error: error as Error,
        });
      }
    }

    res.status(200).json({
      total: filesToDownload.length,
      success: results.filter((i) => i.success).length,
      erros: results.filter((i) => !i.success).length,
      results,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
