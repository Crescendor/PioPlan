// src/utils/authUtils.js
// Authentication, Password Generation and Security Helpers

/**
 * Generates a unique Agent User ID e.g. PIO-4821
 */
export function generateAgentId() {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `PIO-${num}`;
}

/**
 * Generates a secure random password for call center agents
 */
export function generateSecurePassword(length = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

/**
 * Simple SHA-256 hash for secure storage/verification
 */
export async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
