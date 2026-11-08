import { chromium, firefox } from "npm:playwright@1.56.1";
import { PNG } from "npm:pngjs@7.0.0";
import { Buffer } from "node:buffer";
import { pathToFileURL } from "node:url";

const output = new URL("../src/assets/icons/", import.meta.url);
const source = Deno.args[0] ? pathToFileURL(Deno.args[0]) : new URL("icon.png", output);
if (source.protocol !== "file:" || !source.pathname.toLowerCase().endsWith(".png")) throw new Error("Provide a local PNG artwork file.");
const bytes = await Deno.readFile(source);
if (bytes.length < 24 || bytes.length > 16 * 1024 * 1024 ||
    ![137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)) {
  throw new Error("Artwork must be a PNG no larger than 16 MiB.");
}
const header = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
const width = header.getUint32(16), height = header.getUint32(20);
if (width < 1 || height < 1 || width > 4096 || height > 4096) throw new Error("Artwork dimensions must be between 1 and 4096 pixels.");
const image = PNG.sync.read(Buffer.from(bytes));
const master = PNG.sync.write(image, { deflateLevel: 9 });
const browserName = Deno.env.get("CHATTER_BROWSER") || "chrome";
const browser = await (browserName === "firefox" ? firefox.launch({ headless: true }) : chromium.launch({ channel: browserName, headless: true }));
try {
  const page = await browser.newPage();
  const rendered = await page.evaluate(async (source) => {
    const image = new Image();
    image.src = source;
    await image.decode();
    return [16, 32, 48, 64, 96, 128, 512].map((size) => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas rendering is unavailable.");
      context.fillStyle = "#f4eafa";
      context.beginPath();
      context.roundRect(0, 0, size, size, size * 0.18);
      context.fill();
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      const scale = size * 0.9 / Math.max(image.naturalWidth, image.naturalHeight);
      const width = image.naturalWidth * scale, height = image.naturalHeight * scale;
      context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
      return { size, data: canvas.toDataURL("image/png").split(",")[1] };
    });
  }, `data:image/png;base64,${Buffer.from(master).toString("base64")}`);
  await Deno.mkdir(output, { recursive: true });
  await Deno.writeFile(new URL("icon.png", output), master);
  for (const { size, data } of rendered) {
    await Deno.writeFile(new URL(`chatter-watch-${size}.png`, output), Buffer.from(data, "base64"));
    console.log(`Generated ${size}x${size} icon${size === 512 ? " (store artwork; enlarged from the source)" : ""}`);
  }
  console.log(`Canonical artwork: src\\assets\\icons\\icon.png (${width}x${height}). Artwork pixels are preserved; an input outside this canonical path is not modified.`);
} finally { await browser.close(); }
