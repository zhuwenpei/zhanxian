import React, { useEffect, useState } from 'react';
import { Download, Monitor, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function PWARegistrationAndInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (PWA installed and opened)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone 
      || document.referrer.includes('android-app://');
    
    setIsInstalled(isStandalone);

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      console.log('PWA was successfully installed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Show the install prompt
      deferredPrompt.prompt();
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
    } else {
      // If native prompt is not available, show manual guide modal
      setShowGuideModal(true);
    }
  };

  // If already installed and running inside the PWA, don't show the button
  if (isInstalled) {
    return null;
  }

  return (
    <>
      <div className="absolute top-4 right-4 z-50 pointer-events-auto flex items-center gap-2">
        <button
          onClick={handleInstallClick}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 hover:border-indigo-500/50 text-indigo-200 text-xs font-black transition-all shadow-[0_0_15px_rgba(99,102,241,0.1)] hover:shadow-[0_0_20px_rgba(99,102,241,0.2)] cursor-pointer backdrop-blur-md"
          title="下载离线桌面客户端 (PWA)"
        >
          <Download size={14} className="animate-bounce" />
          <span>下载程序</span>
        </button>
      </div>

      {/* Manual Installation Guide Modal */}
      <AnimatePresence>
        {showGuideModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowGuideModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md overflow-hidden rounded-3xl bg-[#0b1324] border border-white/10 p-6 shadow-2xl text-white"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Monitor className="text-indigo-400" size={18} />
                  <h3 className="font-black text-sm tracking-wider">下载安装为桌面应用 (PWA)</h3>
                </div>
                <button
                  onClick={() => setShowGuideModal(false)}
                  className="text-white/40 hover:text-white/90 transition-colors p-1 rounded-lg hover:bg-white/5"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Body */}
              <div className="space-y-4 text-xs text-white/75 leading-relaxed">
                <p>
                  您可以将本「地缘战略推演沙盘」下载并安装至您的电脑或移动端设备，享受更纯净的<b>无边框全屏体验</b>与<b>更低的运行延迟</b>。
                </p>

                <div className="p-3.5 bg-white/[0.02] border border-white/5 rounded-2xl space-y-3">
                  <h4 className="font-bold text-indigo-300">💡 微软 Edge & 谷歌 Chrome 安装步骤：</h4>
                  <ol className="list-decimal list-inside space-y-1.5 pl-1 text-[11px] text-white/70">
                    <li>点击浏览器最右上角的 <span className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-white font-bold">...</span> (菜单) 按钮。</li>
                    <li>在下拉菜单中，找到并选择 <span className="text-white font-bold">「应用」 (Apps)</span> 选项。</li>
                    <li>点击 <span className="text-emerald-400 font-bold">「安装此站点为应用」</span> 或 <span className="text-indigo-400 font-bold">「安装地缘战略推演沙盘」</span>。</li>
                  </ol>
                </div>

                <div className="p-3.5 bg-white/[0.02] border border-white/5 rounded-2xl space-y-2">
                  <h4 className="font-bold text-amber-400">📱 移动端安装步骤：</h4>
                  <ul className="list-disc list-inside space-y-1.5 pl-1 text-[11px] text-white/70">
                    <li><span className="text-white font-bold">iOS (Safari)：</span> 点击底部的 <span className="text-indigo-300 font-bold">「分享」</span> 按钮，下滑选择 <span className="text-amber-300 font-bold">「添加到主屏幕」</span>。</li>
                    <li><span className="text-white font-bold">Android (Chrome)：</span> 点击右上角菜单，选择 <span className="text-amber-300 font-bold">「添加到主屏幕」</span>。</li>
                  </ul>
                </div>

                <div className="text-[10px] text-white/30 text-center pt-2">
                  提示：成功安装后，您可以在桌面直接双击图标启动。
                </div>
              </div>

              {/* Close Button */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowGuideModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-white text-black font-black text-xs hover:bg-white/90 active:scale-95 transition-all cursor-pointer"
                >
                  我知道了
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
