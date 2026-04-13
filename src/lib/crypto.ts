/**
 * End-to-End Encryption Utilities using Web Crypto API
 */

const RSA_ALGO = {
  name: "RSA-OAEP",
  modulusLength: 2048,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: "SHA-256",
};

const AES_ALGO = {
  name: "AES-GCM",
  length: 256,
};

// Helper to convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Helper to convert Base64 to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function generateKeyPair() {
  const keyPair = await window.crypto.subtle.generateKey(
    RSA_ALGO,
    true,
    ["encrypt", "decrypt"]
  );

  const publicKey = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
  const privateKey = await window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey);

  return {
    publicKey: arrayBufferToBase64(publicKey),
    privateKey: arrayBufferToBase64(privateKey),
  };
}

export async function encryptMessage(message: string, recipientPublicKeyBase64: string, senderPublicKeyBase64: string) {
  // 1. Generate a random symmetric key (AES)
  const aesKey = await window.crypto.subtle.generateKey(
    AES_ALGO,
    true,
    ["encrypt", "decrypt"]
  );

  // 2. Encrypt the message with AES
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encodedMessage = new TextEncoder().encode(message);
  const encryptedContent = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    encodedMessage
  );

  // 3. Import public keys
  const recipientPubKey = await window.crypto.subtle.importKey(
    "spki",
    base64ToArrayBuffer(recipientPublicKeyBase64),
    RSA_ALGO,
    false,
    ["encrypt"]
  );
  const senderPubKey = await window.crypto.subtle.importKey(
    "spki",
    base64ToArrayBuffer(senderPublicKeyBase64),
    RSA_ALGO,
    false,
    ["encrypt"]
  );

  // 4. Export the AES key to encrypt it with RSA
  const exportedAesKey = await window.crypto.subtle.exportKey("raw", aesKey);

  // 5. Encrypt the AES key for both recipient and sender
  const encryptedKeyForRecipient = await window.crypto.subtle.encrypt(
    RSA_ALGO,
    recipientPubKey,
    exportedAesKey
  );
  const encryptedKeyForSender = await window.crypto.subtle.encrypt(
    RSA_ALGO,
    senderPubKey,
    exportedAesKey
  );

  return {
    encryptedContent: arrayBufferToBase64(encryptedContent),
    encryptedKeyForRecipient: arrayBufferToBase64(encryptedKeyForRecipient),
    encryptedKeyForSender: arrayBufferToBase64(encryptedKeyForSender),
    iv: arrayBufferToBase64(iv),
  };
}

export async function decryptMessage(
  encryptedContentBase64: string,
  encryptedKeyBase64: string,
  privateKeyBase64: string,
  ivBase64: string
) {
  try {
    // 1. Import private key
    const privateKey = await window.crypto.subtle.importKey(
      "pkcs8",
      base64ToArrayBuffer(privateKeyBase64),
      RSA_ALGO,
      false,
      ["decrypt"]
    );

    // 2. Decrypt the AES key
    const decryptedAesKeyRaw = await window.crypto.subtle.decrypt(
      RSA_ALGO,
      privateKey,
      base64ToArrayBuffer(encryptedKeyBase64)
    );

    const aesKey = await window.crypto.subtle.importKey(
      "raw",
      decryptedAesKeyRaw,
      AES_ALGO,
      false,
      ["decrypt"]
    );

    // 3. Decrypt the message
    const decryptedContent = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64ToArrayBuffer(ivBase64) },
      aesKey,
      base64ToArrayBuffer(encryptedContentBase64)
    );

    return new TextDecoder().decode(decryptedContent);
  } catch (e) {
    console.error("Decryption failed:", e);
    return "[Encrypted Message - Key Missing]";
  }
}
