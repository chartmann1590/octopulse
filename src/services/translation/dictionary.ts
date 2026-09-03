/**
 * Lightweight bundled JS fallback dictionaries for offline translation when ML Kit model
 * is not yet downloaded or native bridge unavailable (iOS, Expo Go).
 * These are curated translations for core app strings; ML Kit native handles the rest dynamically.
 * 
 * Keys are exact English strings as used via t("...") throughout App.tsx.
 * Values are translated strings. Missing entries fall back to English (graceful).
 * 
 * This ensures the app is usable even before the ML Kit model finishes downloading.
 * After model download, native dynamic translation takes over and cache populates.
 */

export const FALLBACK_DICTIONARIES: Record<string, Record<string, string>> = {
  es: {
    // Greetings / onboarding
    'Choose your language': 'Elige tu idioma',
    'Select your native language': 'Selecciona tu idioma nativo',
    'OctoPulse will download a FREE on-device ML Kit for your language and translate every screen automatically. Works offline.':
      'OctoPulse descargará un ML Kit GRATUITO en el dispositivo para tu idioma y traducirá todas las pantallas automáticamente. Funciona sin conexión.',
    'Download ML Kit & Continue': 'Descargar ML Kit y continuar',
    'Downloading ML Kit model...': 'Descargando modelo ML Kit...',
    'Continue': 'Continuar',
    'Skip (Stay in English)': 'Omitir (Quedarse en inglés)',
    'Change Language': 'Cambiar idioma',
    // Dashboard
    'OctoPulse': 'OctoPulse',
    'MONITOR • CONTROL • PRINT': 'MONITOREO • CONTROL • IMPRESIÓN',
    'PRINTERS': 'IMPRESORAS',
    'PRINTING': 'IMPRIMIENDO',
    'ONLINE': 'EN LÍNEA',
    'No printers connected': 'No hay impresoras conectadas',
    'Auto-discover OctoPrint servers on your Wi-Fi network with 1-click authorization approval.':
      'Descubre automáticamente servidores OctoPrint en tu red Wi-Fi con aprobación de autorización en 1 clic.',
    'Discover Printers on Wi-Fi': 'Descubrir impresoras en Wi-Fi',
    'Your Printers': 'Tus impresoras',
    '+ Add Printer': '+ Agregar impresora',
    // Discover
    'Add OctoPrint Server': 'Agregar servidor OctoPrint',
    'Auto-discovery or manual entry': 'Descubrimiento automático o entrada manual',
    'Close': 'Cerrar',
    'Discovered on Local Network': 'Descubierto en red local',
    'Rescan': 'Reescanear',
    'Scanning...': 'Escaneando...',
    'Scanning local subnet for OctoPrint instances...': 'Escaneando subred local para instancias de OctoPrint...',
    'No servers detected yet. Ensure your phone and OctoPrint are connected to the same Wi-Fi network.':
      'No se detectaron servidores aún. Asegúrate de que tu teléfono y OctoPrint estén en la misma red Wi-Fi.',
    'Pair & Connect →': 'Emparejar y conectar →',
    'Manual Configuration': 'Configuración manual',
    'Printer Name (Optional)': 'Nombre de impresora (Opcional)',
    'Host / IP Address *': 'Host / Dirección IP *',
    'Port': 'Puerto',
    'HTTPS': 'HTTPS',
    'Yes': 'Sí',
    'No': 'No',
    'API Key (Leave blank for 1-Click Server Approval)': 'Clave API (Deja en blanco para aprobación en 1 clic)',
    'Connect with API Key': 'Conectar con clave API',
    'Request Access & Connect': 'Solicitar acceso y conectar',
    // Detail tabs
    'OVERVIEW': 'RESUMEN',
    'CONTROL': 'CONTROL',
    'G-CODE': 'CÓDIGO-G',
    'FILES': 'ARCHIVOS',
    'TERMINAL': 'TERMINAL',
    'ALERTS': 'ALERTAS',
    'No file loaded': 'Ningún archivo cargado',
    'Printing': 'Imprimiendo',
    'Paused': 'Pausado',
    'Idle': 'Inactivo',
    'Refresh State': 'Actualizar estado',
    'Cancel Print': 'Cancelar impresión',
    'Pause Print': 'Pausar impresión',
    'Resume Print': 'Reanudar impresión',
    'Emergency Stop': 'Parada de emergencia',
    // Settings
    'Settings': 'Ajustes',
    'OctoPulse Preferences & Info': 'Preferencias e información de OctoPulse',
    'Language & Translation': 'Idioma y traducción',
    'Current Language': 'Idioma actual',
    'ML Kit Model': 'Modelo ML Kit',
    'Downloaded': 'Descargado',
    'Not Downloaded': 'No descargado',
    'Downloading...': 'Descargando...',
    'Free offline translation powered by Google ML Kit': 'Traducción offline gratuita con Google ML Kit',
    'Notifications & Live Alerts': 'Notificaciones y alertas en vivo',
    'Global Notifications': 'Notificaciones globales',
    'Live Monitoring Frequency': 'Frecuencia de monitoreo en vivo',
    'Features & Capabilities': 'Funciones y capacidades',
    'Open Source & Support': 'Código abierto y soporte',
    'About OctoPulse': 'Acerca de OctoPulse',
    'Version': 'Versión',
    'Connected Printers': 'Impresoras conectadas',
    'License': 'Licencia',
  },
  fr: {
    'Choose your language': 'Choisissez votre langue',
    'Select your native language': 'Sélectionnez votre langue maternelle',
    'OctoPulse will download a FREE on-device ML Kit for your language and translate every screen automatically. Works offline.':
      'OctoPulse téléchargera un ML Kit GRATUIT sur l\'appareil pour votre langue et traduira chaque écran automatiquement. Fonctionne hors ligne.',
    'Download ML Kit & Continue': 'Télécharger ML Kit & Continuer',
    'Downloading ML Kit model...': 'Téléchargement du modèle ML Kit...',
    'Continue': 'Continuer',
    'Skip (Stay in English)': 'Ignorer (Rester en anglais)',
    'No printers connected': 'Aucune imprimante connectée',
    'Discover Printers on Wi-Fi': 'Découvrir imprimantes sur Wi-Fi',
    'Add OctoPrint Server': 'Ajouter serveur OctoPrint',
    'Manual Configuration': 'Configuration manuelle',
    'Your Printers': 'Vos imprimantes',
    '+ Add Printer': '+ Ajouter imprimante',
    'OVERVIEW': 'APERÇU',
    'CONTROL': 'CONTRÔLE',
    'FILES': 'FICHIERS',
    'TERMINAL': 'TERMINAL',
    'ALERTS': 'ALERTES',
    'Settings': 'Paramètres',
    'Language & Translation': 'Langue et traduction',
    'Current Language': 'Langue actuelle',
    'ML Kit Model': 'Modèle ML Kit',
    'Downloaded': 'Téléchargé',
    'Not Downloaded': 'Non téléchargé',
    'Free offline translation powered by Google ML Kit': 'Traduction hors ligne gratuite par Google ML Kit',
  },
  de: {
    'Choose your language': 'Wähle deine Sprache',
    'Select your native language': 'Wähle deine Muttersprache',
    'OctoPulse will download a FREE on-device ML Kit for your language and translate every screen automatically. Works offline.':
      'OctoPulse lädt ein KOSTENLOSES ML Kit auf dem Gerät für deine Sprache herunter und übersetzt jeden Bildschirm automatisch. Funktioniert offline.',
    'Download ML Kit & Continue': 'ML Kit herunterladen & fortfahren',
    'Downloading ML Kit model...': 'ML Kit-Modell wird heruntergeladen...',
    'Continue': 'Weiter',
    'No printers connected': 'Keine Drucker verbunden',
    'Discover Printers on Wi-Fi': 'Drucker im WLAN entdecken',
    'Add OctoPrint Server': 'OctoPrint-Server hinzufügen',
    'Settings': 'Einstellungen',
    'Language & Translation': 'Sprache & Übersetzung',
    'Current Language': 'Aktuelle Sprache',
    'ML Kit Model': 'ML Kit-Modell',
    'Downloaded': 'Heruntergeladen',
    'Not Downloaded': 'Nicht heruntergeladen',
  },
  zh: {
    'Choose your language': '选择你的语言',
    'Select your native language': '选择你的母语',
    'OctoPulse will download a FREE on-device ML Kit for your language and translate every screen automatically. Works offline.':
      'OctoPulse 将为你的语言下载免费的设备端 ML Kit，自动翻译每个界面。支持离线使用。',
    'Download ML Kit & Continue': '下载 ML Kit 并继续',
    'Downloading ML Kit model...': '正在下载 ML Kit 模型...',
    'Continue': '继续',
    'Skip (Stay in English)': '跳过（保持英语）',
    'No printers connected': '未连接打印机',
    'Settings': '设置',
    'Language & Translation': '语言与翻译',
    'Current Language': '当前语言',
    'Downloaded': '已下载',
    'Not Downloaded': '未下载',
  },
  ja: {
    'Choose your language': '言語を選択',
    'Select your native language': '母国語を選択',
    'OctoPulse will download a FREE on-device ML Kit for your language and translate every screen automatically. Works offline.':
      'OctoPulseはあなたの言語用の無料オンデバイスML Kitをダウンロードし、すべての画面を自動翻訳します。オフラインで動作します。',
    'Download ML Kit & Continue': 'ML Kitをダウンロードして続行',
    'Downloading ML Kit model...': 'ML Kitモデルをダウンロード中...',
    'Continue': '続ける',
    'No printers connected': 'プリンターが接続されていません',
    'Settings': '設定',
    'Language & Translation': '言語と翻訳',
    'Current Language': '現在の言語',
    'Downloaded': 'ダウンロード済み',
  },
  pt: {
    'Choose your language': 'Escolha seu idioma',
    'Select your native language': 'Selecione seu idioma nativo',
    'OctoPulse will download a FREE on-device ML Kit for your language and translate every screen automatically. Works offline.':
      'OctoPulse baixará um ML Kit GRATUITO no dispositivo para seu idioma e traduzirá todas as telas automaticamente. Funciona offline.',
    'Download ML Kit & Continue': 'Baixar ML Kit e continuar',
    'Downloading ML Kit model...': 'Baixando modelo ML Kit...',
    'Continue': 'Continuar',
    'No printers connected': 'Nenhuma impressora conectada',
    'Settings': 'Configurações',
    'Language & Translation': 'Idioma e tradução',
    'Current Language': 'Idioma atual',
    'Downloaded': 'Baixado',
  },
  ru: {
    'Choose your language': 'Выберите язык',
    'Select your native language': 'Выберите родной язык',
    'OctoPulse will download a FREE on-device ML Kit for your language and translate every screen automatically. Works offline.':
      'OctoPulse загрузит БЕСПЛАТНЫЙ ML Kit на устройстве для вашего языка и автоматически переведет каждый экран. Работает офлайн.',
    'Download ML Kit & Continue': 'Загрузить ML Kit и продолжить',
    'Downloading ML Kit model...': 'Загрузка модели ML Kit...',
    'Continue': 'Продолжить',
    'No printers connected': 'Нет подключенных принтеров',
    'Settings': 'Настройки',
    'Language & Translation': 'Язык и перевод',
    'Current Language': 'Текущий язык',
    'Downloaded': 'Загружено',
  },
  ar: {
    'Choose your language': 'اختر لغتك',
    'Select your native language': 'اختر لغتك الأم',
    'OctoPulse will download a FREE on-device ML Kit for your language and translate every screen automatically. Works offline.':
      'سيقوم OctoPulse بتنزيل ML Kit مجاني على الجهاز للغتك وترجمة كل شاشة تلقائياً. يعمل بدون اتصال.',
    'Download ML Kit & Continue': 'تنزيل ML Kit والمتابعة',
    'Downloading ML Kit model...': 'جاري تنزيل نموذج ML Kit...',
    'Continue': 'متابعة',
    'No printers connected': 'لا توجد طابعات متصلة',
    'Settings': 'الإعدادات',
    'Language & Translation': 'اللغة والترجمة',
    'Current Language': 'اللغة الحالية',
    'Downloaded': 'تم التنزيل',
  },
  hi: {
    'Choose your language': 'अपनी भाषा चुनें',
    'Select your native language': 'अपनी मातृभाषा चुनें',
    'OctoPulse will download a FREE on-device ML Kit for your language and translate every screen automatically. Works offline.':
      'OctoPulse आपकी भाषा के लिए एक मुफ्त ऑन-डिवाइस ML Kit डाउनलोड करेगा और हर स्क्रीन का स्वचालित अनुवाद करेगा। ऑफ़लाइन काम करता है।',
    'Download ML Kit & Continue': 'ML Kit डाउनलोड करें और जारी रखें',
    'Downloading ML Kit model...': 'ML Kit मॉडल डाउनलोड हो रहा है...',
    'Continue': 'जारी रखें',
    'No printers connected': 'कोई प्रिंटर कनेक्ट नहीं है',
    'Settings': 'सेटिंग्स',
    'Language & Translation': 'भाषा और अनुवाद',
    'Current Language': 'वर्तमान भाषा',
    'Downloaded': 'डाउनलोड किया गया',
  },
};

export function getFallbackTranslation(text: string, langCode: string): string | null {
  const code = langCode.toLowerCase().split('-')[0];
  const dict = FALLBACK_DICTIONARIES[code];
  if (!dict) return null;
  // Exact match
  if (dict[text] !== undefined) return dict[text];
  // Trim match
  const trimmed = text.trim();
  if (dict[trimmed] !== undefined) return dict[trimmed];
  return null;
}

// Extend for all languages with English fallback gracefully
// If a language has no entry, we return null and let caller fallback to EN or try MLKit
