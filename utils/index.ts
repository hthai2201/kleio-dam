import axios from "axios";
import fs from "fs";
import path from "path";
import { Asset, DownloadResult } from "~/types/index.js";

export const fetchFilesFromUrl = async (url: string): Promise<Asset[]> => {
  try {
    const response = await axios.get(url);

    if (response.status !== 200) {
      throw new Error(`Failed to fetch data from ${url}`);
    }

    const result = response.data?.results || [];
    return result.map((item: Asset) => {
      //example: "/spgroup/pdf/media-coverage/2023/11-Apr-2023.pdf/jcr:content"
      return {
        ...item,
        "@path": item["@path"].replace(/\/jcr:content$/, ""),
      };
    });
  } catch (error) {
    console.error(`Error fetching data from ${url}:`, error);
    throw { error: "Error fetching data" };
  }
};

export const downloadFile = async (
  asset: Asset,
  {
    baseUrl,
    outputDir,
    useJCRPath,
  }: { baseUrl: string; outputDir?: string; useJCRPath?: string }
): Promise<DownloadResult> => {
  const url = `${baseUrl}/dam${asset["@path"]}`;
  try {
    let result: DownloadResult = {
      fileName: asset.fileName || asset["@name"],
      id: asset["@id"],
      success: true,
      message: "File downloaded and saved successfully",
    };

    const filePath = path.join(
      outputDir || process.cwd(),
      "dam",
      asset["@path"]
    );

    const dirname = path.dirname(filePath);
    if (!fs.existsSync(dirname)) {
      fs.mkdirSync(dirname, { recursive: true });
    }
    if (fs.existsSync(filePath)) {
      result = {
        fileName: asset.fileName || asset["@name"],
        id: asset["@id"],
        success: true,
        message: "File existed",
      };
    } else {
      const response = await axios.get(url, { responseType: "stream" });

      if (response.status !== 200) {
        throw new Error(`Failed to download file from ${url}`);
      }
      const fileStream = fs.createWriteStream(filePath);

      await new Promise<void>((resolve, reject) => {
        response.data.pipe(fileStream);
        response.data.on("error", (err: Error) => {
          fs.unlink(filePath, () => {
            fileStream.close();
            reject(err);
          });
        });
        fileStream.on("finish", () => {
          fileStream.close();
          resolve();
        });
      });
    }

    if (useJCRPath) {
      const jcrPath = path.join(
        outputDir || process.cwd(),
        "dam",
        `jcr:${asset["@id"]}`,
        asset["@name"]
      );
      const jcrDirname = path.dirname(jcrPath);

      if (!fs.existsSync(jcrDirname)) {
        fs.mkdirSync(jcrDirname, { recursive: true });
      }

      if (!fs.existsSync(jcrPath)) {
        await fs.promises.copyFile(filePath, jcrPath);
      }
    }

    return result;
  } catch (error) {
    console.error(`Error downloading file from ${url}:`, error);

    const result: DownloadResult = {
      fileName: asset.fileName || asset["@name"],
      id: asset["@id"],
      success: false,
      error: error as Error,
    };

    return result;
  }
};

export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const result: T[][] = [];

  for (let i = 0; i < array.length; i += chunkSize) {
    result.push(array.slice(i, i + chunkSize));
  }

  return result;
}
export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
