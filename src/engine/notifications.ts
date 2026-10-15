import { soundEffects } from './soundEffects';

class NotificationEngine {
  private lastNotifiedTimestamp = 0;
  private lastNotifiedCount = 0; // 记录上次提醒时的单词数，未增加绝不重复响铃轰炸
  private isEnabled = true; // 全局通知开关 (桌面弹窗与标题闪烁)
  private isAlarmSoundEnabled = true; // 复习到期铃声开关 (风铃叮叮音)
  private originalTitle = typeof document !== 'undefined' ? document.title : '';
  private flashInterval: ReturnType<typeof setInterval> | null = null;

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    if (!enabled) {
      this.stopTitleFlashing();
    }
  }

  public setAlarmSoundEnabled(enabled: boolean) {
    this.isAlarmSoundEnabled = enabled;
    soundEffects.setReviewAlarmEnabled(enabled);
  }

  public resetBatch() {
    this.lastNotifiedCount = 0;
    this.lastNotifiedTimestamp = 0;
  }

  // 请求 Windows 系统原生通知权限
  public async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }
    if (Notification.permission === 'granted') {
      return true;
    }
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }

  // 触发到期复习强提醒 (Windows 系统通知 + 风铃音效 + 标题呼吸闪烁)
  public notifyReviewDue(dueCount: number, onOpenReview: () => void, force = false) {
    if (!this.isEnabled) {
      this.stopTitleFlashing();
      return;
    }

    const now = Date.now();

    // 核心防重复轰炸逻辑：
    // 1. 如果待复习单词数没有增加（dueCount <= lastNotifiedCount），绝不重复叮叮叮响铃！
    if (!force && dueCount <= this.lastNotifiedCount) {
      return;
    }

    // 2. 两次提醒之间至少间隔 5 分钟
    if (!force && now - this.lastNotifiedTimestamp < 5 * 60 * 1000) {
      return;
    }

    this.lastNotifiedTimestamp = now;
    this.lastNotifiedCount = dueCount;

    // 1. 播放穿透力风铃音 (只有开启了复习铃声时才响)
    if (this.isAlarmSoundEnabled) {
      soundEffects.playReviewAlarm();
    }

    // 2. 网页标题呼吸闪烁强提示
    this.startTitleFlashing(dueCount);

    // 3. 发送 Windows 原生桌面系统通知
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const notification = new Notification('⏰ PaperWords 艾宾浩斯复习提醒', {
          body: `已有 ${dueCount} 个单词到达记忆临界点（5m/30m/12h）！点击立即开始主动回忆自测。`,
          icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⏰</text></svg>',
          tag: 'ebbinghaus-due-alarm',
          requireInteraction: true, // 保持常驻，直到用户交互
        });

        notification.onclick = () => {
          window.focus();
          this.stopTitleFlashing();
          notification.close();
          onOpenReview();
        };
      } catch {
        // 兜底
      }
    }
  }

  private startTitleFlashing(dueCount: number) {
    if (this.flashInterval) return;
    let step = false;
    this.flashInterval = setInterval(() => {
      document.title = step
        ? `【🔔 ${dueCount} 词待复习!】`
        : `【⏰ 艾宾浩斯到期提醒】`;
      step = !step;
    }, 800);
  }

  public stopTitleFlashing() {
    if (this.flashInterval) {
      clearInterval(this.flashInterval);
      this.flashInterval = null;
      document.title = this.originalTitle || 'PaperWords | 流式纸感背单词';
    }
  }
}

export const notificationEngine = new NotificationEngine();
