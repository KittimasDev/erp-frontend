/**
 * Password policy — ต้องตรงกับ backend `src/users/constants/password-policy.ts`
 * (มีแค่ความยาวขั้นต่ำ ไม่มี complexity / อายุ / ประวัติ)
 */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MIN_MESSAGE = `รหัสผ่านต้องมีอย่างน้อย ${PASSWORD_MIN_LENGTH} ตัวอักษร`;
export const PASSWORD_PLACEHOLDER = `อย่างน้อย ${PASSWORD_MIN_LENGTH} ตัวอักษร`;
