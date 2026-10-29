/**
 * antiSpamFollowChannel.js
 * narzx/baileys — Anti Spam Follow Channel Module
 *
 * Dipasang di atas Baileys (pakai sock.newsletterFollow bawaan Baileys),
 * bukan modifikasi internal library.
 *
 * Fitur:
 *  - Cooldown per user biar gak spam command follow
 *  - Limit jumlah follow per periode waktu (default: 2x per jam)
 *  - Queue + delay antar proses follow (anti kena limit/ban dari WA)
 *  - Cek duplikat channel yang udah di-follow
 *  - Data persisten ke file JSON
 */

import fs from 'fs';
import path from 'path';

class AntiSpamFollowChannel {
  constructor(options = {}) {
    this.sock = options.sock || null; // instance makeWASocket, bisa di-set belakangan via setSock()
    this.dataFile = options.dataFile || path.join(process.cwd(), 'antispam_follow.json');
    this.maxFollowsPerWindow = options.maxFollowsPerWindow ?? 2; // default: cuma 2 per window
    this.windowMs = options.windowMs ?? 60 * 60 * 1000; // default window: 1 jam
    this.userCooldownMs = options.userCooldownMs ?? 30 * 1000; // cooldown command per user
    this.delayBetweenFollowsMs = options.delayBetweenFollowsMs ?? 5000; // jeda antar follow asli

    this.data = this._load();
    this.queue = [];
    this.processing = false;
  }

  setSock(sock) {
    this.sock = sock;
  }

  _load() {
    try {
      if (fs.existsSync(this.dataFile)) {
        return JSON.parse(fs.readFileSync(this.dataFile, 'utf-8'));
      }
    } catch (err) {
      console.error('[AntiSpamFollow] Gagal load data, mulai dari kosong:', err.message);
    }
    return { followHistory: [], userLastCommand: {} };
  }

  _save() {
    try {
      fs.writeFileSync(this.dataFile, JSON.stringify(this.data, null, 2));
    } catch (err) {
      console.error('[AntiSpamFollow] Gagal simpan data:', err.message);
    }
  }

  _cleanOldHistory() {
    const now = Date.now();
    this.data.followHistory = this.data.followHistory.filter(
      (entry) => now - entry.timestamp < this.windowMs
    );
  }

  canUserRequest(userJid) {
    const now = Date.now();
    const last = this.data.userLastCommand[userJid];
    if (last && now - last < this.userCooldownMs) {
      const remaining = Math.ceil((this.userCooldownMs - (now - last)) / 1000);
      return { allowed: false, reason: `Tunggu ${remaining} detik lagi sebelum request follow channel lagi.` };
    }
    return { allowed: true };
  }

  canFollowMore() {
    this._cleanOldHistory();
    if (this.data.followHistory.length >= this.maxFollowsPerWindow) {
      const minutes = Math.round(this.windowMs / 60000);
      return {
        allowed: false,
        reason: `Limit follow channel tercapai (${this.maxFollowsPerWindow}x per ${minutes} menit). Coba lagi nanti.`,
      };
    }
    return { allowed: true };
  }

  /**
   * Request follow channel dengan proteksi anti-spam.
   * @param {string} userJid - JID user yang minta follow (buat cooldown per user)
   * @param {string} channelJid - JID channel/newsletter yang mau di-follow
   * @returns {Promise<{success: boolean, reason?: string}>}
   */
  async requestFollow(userJid, channelJid) {
    const userCheck = this.canUserRequest(userJid);
    if (!userCheck.allowed) return { success: false, reason: userCheck.reason };

    this.data.userLastCommand[userJid] = Date.now();
    this._save();

    const limitCheck = this.canFollowMore();
    if (!limitCheck.allowed) return { success: false, reason: limitCheck.reason };

    const alreadyFollowed = this.data.followHistory.some((e) => e.channelJid === channelJid);
    if (alreadyFollowed) {
      return { success: false, reason: 'Channel ini udah di-follow baru-baru ini.' };
    }

    return new Promise((resolve) => {
      this.queue.push({ channelJid, resolve });
      this._processQueue();
    });
  }

  async _processQueue() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    const { channelJid, resolve } = this.queue.shift();
    try {
      if (!this.sock) {
        throw new Error('Socket belum di-set. Panggil setSock(sock) dulu setelah koneksi aktif.');
      }
      if (typeof this.sock.newsletterFollow !== 'function') {
        throw new Error('sock.newsletterFollow tidak tersedia di versi Baileys ini.');
      }

      await this.sock.newsletterFollow(channelJid);

      this.data.followHistory.push({ channelJid, timestamp: Date.now() });
      this._save();

      resolve({ success: true });
    } catch (err) {
      console.error('[AntiSpamFollow] Gagal follow channel:', err.message);
      resolve({ success: false, reason: 'Gagal follow channel: ' + err.message });
    } finally {
      this.processing = false;
      if (this.queue.length > 0) {
        setTimeout(() => this._processQueue(), this.delayBetweenFollowsMs);
      }
    }
  }

  getStats() {
    this._cleanOldHistory();
    return {
      followedInWindow: this.data.followHistory.length,
      maxPerWindow: this.maxFollowsPerWindow,
      remaining: Math.max(0, this.maxFollowsPerWindow - this.data.followHistory.length),
    };
  }
}

export default AntiSpamFollowChannel;
