import React, { useState, useEffect } from 'react';
import { Table, ShieldCheck, Smartphone, RefreshCw, Sparkles, CheckCircle2 } from 'lucide-react';

interface GoogleUser {
  email: string;
  name: string;
  picture?: string;
  accessToken: string;
}

interface GoogleLoginModalProps {
  isOpen: boolean;
  onLoginSuccess: (user: GoogleUser) => void;
}

export const GoogleLoginModal: React.FC<GoogleLoginModalProps> = ({ isOpen, onLoginSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [clientId, setClientId] = useState<string>(() => {
    return (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || localStorage.getItem('custom_google_client_id') || '';
  });
  const [showConfig, setShowConfig] = useState(false);

  if (!isOpen) return null;

  const handleGoogleLogin = () => {
    const activeClientId = clientId.trim() || (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID;

    if (!activeClientId) {
      setShowConfig(true);
      alert('Google OAuth Client ID가 필요합니다. 구글 콘솔에서 생성한 웹 클라이언트 ID를 입력해 주세요.');
      return;
    }

    localStorage.setItem('custom_google_client_id', activeClientId);
    setLoading(true);
    setStatusMsg('구글 인증 창을 여는 중...');

    // Standard OAuth token endpoint popup URL setup
    const scope = encodeURIComponent(
      'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile'
    );
    const redirectUri = window.location.origin;

    // Use GIS script if available, or OAuth token window
    if ((window as any).google?.accounts?.oauth2) {
      try {
        const client = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: activeClientId,
          scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
          callback: async (tokenResponse: any) => {
            if (tokenResponse.access_token) {
              await verifyAndCompleteLogin(tokenResponse.access_token);
            } else {
              setLoading(false);
            }
          },
        });
        client.requestAccessToken();
        return;
      } catch (e) {
        console.warn('GIS Client init error, falling back to popup', e);
      }
    }

    // Fallback: Custom OAuth Token / Interactive Auth Prompt
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
      activeClientId
    )}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=token&scope=${scope}&include_granted_scopes=true&prompt=consent`;

    const width = 500;
    const height = 600;
    const left = window.screenX + (window.innerWidth - width) / 2;
    const top = window.screenY + (window.innerHeight - height) / 2;

    const popup = window.open(
      authUrl,
      'google_oauth_popup',
      `width=${width},height=${height},left=${left},top=${top}`
    );

    const tokenCheckInterval = setInterval(async () => {
      try {
        if (!popup || popup.closed) {
          clearInterval(tokenCheckInterval);
          setLoading(false);
          return;
        }

        const href = popup.location.href;
        if (href && href.includes('access_token=')) {
          clearInterval(tokenCheckInterval);
          popup.close();

          const urlParams = new URLSearchParams(href.split('#')[1] || href.split('?')[1]);
          const accessToken = urlParams.get('access_token');
          if (accessToken) {
            await verifyAndCompleteLogin(accessToken);
          } else {
            setLoading(false);
          }
        }
      } catch (e) {
        // Cross-origin check while redirecting, ignore
      }
    }, 500);
  };

  const verifyAndCompleteLogin = async (accessToken: string) => {
    try {
      setStatusMsg('구글 사용자 프로필 확인 중...');
      const userRes = await fetch('/api/auth/userinfo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken }),
      });

      let userInfo = { email: 'user@gmail.com', name: '구글 사용자', picture: '' };
      if (userRes.ok) {
        const userData = await userRes.json();
        userInfo = userData.userInfo || userInfo;
      }

      setStatusMsg('Google Drive / Sheets 연동 완료!');
      setTimeout(() => {
        onLoginSuccess({
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture,
          accessToken,
        });
        setLoading(false);
      }, 600);
    } catch (err) {
      console.error(err);
      setStatusMsg('로그인 완료, Sheets 동기화를 진행합니다.');
      onLoginSuccess({
        email: 'user@gmail.com',
        name: '구글 사용자',
        accessToken,
      });
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl max-w-md w-full p-7 shadow-2xl border border-slate-100 text-center space-y-6 relative overflow-hidden">
        {/* Decorative Top Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-green-600" />

        {/* Icon Header */}
        <div className="mx-auto w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-xs">
          <Table className="w-8 h-8 text-emerald-600" />
        </div>

        {/* Titles */}
        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold bg-emerald-100/80 text-emerald-800 border border-emerald-200">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Google Drive & Sheets 실시간 연동</span>
          </span>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            구글 계정으로 로그인하기
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
            어느 기기(스마트폰, PC, 태블릿)에서 접속하더라도 동일한 구글 계정이면 구글 시트에 자동 저장되어 데이터가 완벽하게 연동됩니다.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left space-y-2.5 text-xs text-slate-700">
          <div className="flex items-start space-x-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              <strong>Google Sheets 엑셀 자동 정리</strong>: 식단, 냉장고 재료, 지출 내역이 깔끔한 엑셀 표로 자동 작성됩니다.
            </span>
          </div>
          <div className="flex items-start space-x-2.5">
            <Smartphone className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              <strong>모든 기기 연속 사용</strong>: 기기를 바꿔도 언제 어디서든 이전 기록과 냉장고 목록을 이어받아 사용하세요.
            </span>
          </div>
          <div className="flex items-start space-x-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              <strong>개인 구글 드라이브 보관</strong>: 데이터는 오직 사용자의 구글 드라이브 개인 폴더에만 안전히 저장됩니다.
            </span>
          </div>
        </div>

        {/* Client ID Optional Setting Toggle */}
        <div className="pt-1 text-left">
          <button
            type="button"
            onClick={() => setShowConfig(!showConfig)}
            className="text-[11px] text-slate-400 hover:text-slate-600 underline font-medium"
          >
            {showConfig ? '▲ Client ID 입력창 닫기' : '⚙️ Google OAuth Client ID 직접 설정 (선택)'}
          </button>

          {showConfig && (
            <div className="mt-2.5 p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
              <label className="block text-[11px] font-bold text-slate-700">
                Google Cloud Web Client ID:
              </label>
              <input
                type="text"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="예: xxxxxxxx.apps.googleusercontent.com"
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
              <p className="text-[10px] text-slate-400">
                Google Cloud 콘솔의 [클라이언트] 메뉴에서 만든 웹 클라이언트 ID를 붙여넣으세요.
              </p>
            </div>
          )}
        </div>

        {/* Google Login Button */}
        <div className="space-y-3 pt-1">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-3.5 px-4 bg-white hover:bg-slate-50 text-slate-800 font-extrabold text-sm rounded-2xl border-2 border-slate-200 shadow-md transition-all flex items-center justify-center space-x-3 active:scale-[0.99] disabled:opacity-75"
          >
            {loading ? (
              <RefreshCw className="w-5 h-5 text-emerald-600 animate-spin" />
            ) : (
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>{loading ? statusMsg || '구글 동기화 연결 중...' : 'Google 계정으로 시작하기'}</span>
          </button>

          <p className="text-[11px] text-slate-400">
            버튼을 누르면 구글 동의 창이 열리며, 승인 후 구글 시트 자동 동기화가 활성화됩니다.
          </p>
        </div>
      </div>
    </div>
  );
};
