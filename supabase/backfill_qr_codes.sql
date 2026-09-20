-- RecycleConnect V2 — assign a QR code ID to EVERY centre at once.
-- Run in Supabase SQL Editor (bypasses RLS, which blocks anon UPDATEs).
-- Safe to re-run: only touches rows still missing a QR id.
--
-- Formula matches the app exactly (QRManagement + scripts/generateQrCodes.mjs):
--   FIRST 8 LETTERS OF NAME (A-Z only, uppercased) + "_" + LAST 4 OF ID
--   e.g. "IPC Recycling & Buy-Back Centre" → "IPCRECYL_XXXXXXXX"
--
-- After this, Admin → QR Codes shows ✓ on every centre. The QR image itself
-- encodes:  https://recycleconnectv2.vercel.app/check-in?centre=<centre id>
-- and is rendered/downloaded on demand — no PNG files needed.

UPDATE recycling_centres
SET qr_code_id =
  UPPER(LEFT(REGEXP_REPLACE(name, '[^A-Za-z]', '', 'g'), 8))
  || '_'
  || UPPER(RIGHT(id::text, 4))
WHERE qr_code_id IS NULL;

-- Verify: expect 0 rows still missing, and no duplicate ids.
SELECT count(*) AS still_missing FROM recycling_centres WHERE qr_code_id IS NULL;
SELECT qr_code_id, count(*) FROM recycling_centres GROUP BY qr_code_id HAVING count(*) > 1;
