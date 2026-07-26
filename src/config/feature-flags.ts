/**
 * แปลงรูป → รับผลผลิตเข้าคลัง
 * เปิดใช้งานแล้ว (2026-07-25) หลังผูก Production Order (Pyrolysis) เข้ากับ
 * production-output-stock-requests ด้วย FK จริง (production_order_id) —
 * เดิมปิดไว้เพราะยังไม่มีทางอ้างอิงเอกสารต้นทางที่ตรวจสอบได้จริง
 */
export const PRODUCTION_OUTPUT_ENABLED = true;
