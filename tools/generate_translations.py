#!/usr/bin/env python3
# Generate Play Store listing translations for multiple languages
import pathlib, json, textwrap

base = pathlib.Path(r"H:\octo-app")
en_title = "OctoPulse: OctoPrint Companion"
en_short = "Control your OctoPrint 3D printer from your phone. Monitor & print on Wi-Fi."
# For en-GB we use slightly localised short
en_gb_short = "Control your OctoPrint 3D printer from your phone. Monitor & print over Wi-Fi."

# Define per-language data
translations = {
    "en-GB": {
        "title": "OctoPulse: OctoPrint Companion",
        "short": "Control your OctoPrint 3D printer from your phone. Monitor & print over Wi-Fi.",
        "full": None,  # will use en-US with UK spelling tweaks
    },
    "de-DE": {
        "title": "OctoPulse: OctoPrint Begleiter",
        "short": "Steuere deinen OctoPrint 3D-Drucker vom Handy. Überwache & drucke im WLAN.",
        "full": """Dein OctoPrint für die Hosentasche. Überwache, steuere und drucke von deinem Android-Handy — kein Konto nötig.

OctoPulse ist der kostenlose, datenschutzfreundliche Begleiter für OctoPrint. Prüfe den Fortschritt, schaue die Kamera an und verwalte Drucke überall in deinem WLAN. Funktioniert mit OctoPi, Ender 3, Prusa, Bambu (mit OctoPrint) und jedem Drucker mit OctoPrint.

WARUM OCTOPULSE?
• Kostenlos & Open Source — kein Abo, keine Cloud. Daten bleiben zwischen Handy und Drucker.
• Für Maker gemacht — schnell, modern und für echte Druckfarmen und Hobby-Setups gebaut.
• Respektvolle Werbung — kleines Banner + gelegentliches Interstitial nach Setup. Niemals während des Drucks.

HAUPTFUNKTIONEN
🔍 AUTO-ERKENNUNG — Findet OctoPrint in Sekunden im WLAN via mDNS/Bonjour, SSDP und intelligentem Subnetz-Scan. Keine IP-Adressen tippen. Strikte OctoPrint-Prüfung, nur echte Drucker werden angezeigt.
⚡ 1-TIPP-KOPPLUNG — Verbindet mit offiziellen Application Keys. Einfach Drucker tippen → In OctoPrint bestätigen → fertig. Keine API-Schlüssel kopieren.
📊 DASHBOARD AUF EINEN BLICK — Alle Drucker an einem Ort: Status, Fortschritt %, Restzeit, Düsen- & Bett-Temperaturen. Zum Aktualisieren ziehen.
📷 LIVE-KAMERA — MJPEG/Snapshot-Streaming mit Spiegeln, Drehen und Auto-Reconnect. Behalte erste Schichten vom Sofa oder der Werkstatt im Auge.
🎛️ VOLLE KONTROLLE — X/Y/Z verfahren, homen, extrudieren/retracten, Düsen-/Bett-Temperaturen, Lüfter, Not-Aus und G-Code über Terminal senden.
📐 G-CODE-VORSCHAU — 2D- & 3D-Schichtansicht mit Pinch-Zoom und Orbit. Schichten prüfen vor dem Druck.
📄 DATEIVERWALTUNG — OctoPrint-Dateien durchsuchen, Details ansehen, Druck starten oder löschen.
🔔 SMARTE BENACHRICHTIGUNGEN — Benachrichtigung bei Druck fertig, Fehler oder 25/50/75/90 %. Pro Drucker umschaltbar und Hintergrund-Polling. Respektiert Nicht stören.
🌙 POLIERT & PRIVAT — Dark Theme, Haptik, Offline-Handhabung. Hosts, API-Schlüssel und Kamera-URLs verschlüsselt auf dem Gerät, verlassen nie dein Netzwerk.

SO FUNKTIONIERT'S
1) OctoPulse installieren und ins gleiche WLAN wie OctoPrint gehen.
2) „Drucker im WLAN finden“ tippen, deinen wählen, Koppeln & in OctoPrint bestätigen.
3) Fortschritt überwachen, Kamera schauen, pausieren/stoppen und nächsten Druck starten.

KOMPATIBILITÄT
Funktioniert mit jedem Drucker mit OctoPrint — inklusive OctoPi auf Raspberry Pi. Wenn du OctoPrint im Browser öffnen kannst, kann OctoPulse verbinden. Für Fernzugriff nutze deine VPN/Reverse-Proxy-URL.

DATENSCHUTZ ZUERST
• Kein Konto, keine Anmeldung.
• Druckdateien, G-Code und Kamerabilder gehen nie an unsere Server.
• API-Schlüssel verschlüsselt mit Android Keystore.
• Kein genauer Standort — Erkennung scannt nur dein lokales Subnetz.
Vollständige Datenschutzrichtlinie: https://chartmann1590.github.io/octopulse/privacy.html

WERBUNG & PREISE
OctoPulse ist kostenlos und werbefinanziert via Google AdMob. Kleines verankertes Banner und manchmal Vollbild-Anzeige nach Setup — nie während des Drucks. Advertising ID zurücksetzen in Android Einstellungen → Datenschutz → Anzeigen. Mehr in Datenschutz §4.

BERECHTIGUNGEN ERKLÄRT
INTERNET, ACCESS_NETWORK_STATE, ACCESS_WIFI_STATE, CHANGE_WIFI_MULTICAST_STATE (für mDNS), POST_NOTIFICATIONS, RECEIVE_BOOT_COMPLETED, VIBRATE, AD_ID. Kein Standort, Kamera oder Kontakte.

OPEN SOURCE & SUPPORT
OctoPulse ist Open Source (MIT) auf github.com/chartmann1590/octopulse. Sterne geben, Issues melden oder sponsorieren: buymeacoffee.com/charleshartmann

SUPPORT
Probleme oder Ideen? Issue auf GitHub oder E-Mail an hello@octopulse.app

—
Nicht verbunden mit OctoPrint. OctoPrint ist Marke der Eigentümer. Ender, Prusa, Bambu sind Marken ihrer Eigentümer."""
    },
    "fr-FR": {
        "title": "OctoPulse Compagnon OctoPrint",
        "short": "Contrôlez votre imprimante 3D OctoPrint depuis votre téléphone. Surveillez et imprimez en Wi-Fi.",
        "full": """Votre OctoPrint dans votre poche. Surveillez, contrôlez et imprimez depuis votre téléphone Android — aucun compte requis.

OctoPulse est le compagnon gratuit et respectueux de la vie privée pour OctoPrint. Vérifiez l'avancement, regardez la caméra et gérez les impressions partout sur votre Wi-Fi. Fonctionne avec OctoPi, Ender 3, Prusa, Bambu (avec OctoPrint) et toute imprimante sous OctoPrint.

POURQUOI OCTOPULSE ?
• Gratuit & open source — pas d'abonnement, pas de cloud. Les données restent entre votre téléphone et votre imprimante.
• Fait pour les makers — rapide, moderne, conçu pour les fermes d'impression et les hobbyistes.
• Publicités respectueuses — petite bannière + occasionnel interstitiel après la configuration. Jamais pendant l'impression.

FONCTIONNALITÉS CLÉS
🔍 DÉCOUVERTE AUTO — Trouve OctoPrint sur votre Wi-Fi en secondes via mDNS/Bonjour, SSDP et scan intelligent du sous-réseau. Pas besoin de saisir d'adresse IP. Vérification stricte OctoPrint, seuls les vrais imprimantes s'affichent.
⚡ APPAIRAGE EN 1 TAP — Connexion via Application Keys officielles. Appuyez sur votre imprimante → Approuvez dans OctoPrint → terminé. Pas de clés API à copier.
📊 TABLEAU DE BORD EN UN COUP D'ŒIL — Toutes les imprimantes au même endroit : statut, %, temps restant, températures buse & lit. Tirez pour rafraîchir.
📷 CAMÉRA EN DIRECT — Streaming MJPEG/snapshot avec miroir, rotation et reconnexion auto. Surveillez les premières couches depuis le canapé ou l'atelier.
🎛️ CONTRÔLE TOTAL — Déplacer X/Y/Z, home, extruder/rétracter, régler températures buse/lit, ventilateur, arrêt d'urgence et envoyer du G-code via terminal.
📐 APERÇU G-CODE — Visionneuse 2D & 3D des couches avec pincement-zoom et orbite. Vérifiez les couches avant d'imprimer.
📄 GESTIONNAIRE DE FICHIERS — Parcourez les fichiers OctoPrint, prévisualisez, lancez une impression ou supprimez.
🔔 ALERTES INTELLIGENTES — Notification fin d'impression, échec ou 25/50/75/90 %. Par imprimante, polling en arrière-plan. Respecte Ne pas déranger.
🌙 SOIGNÉ & PRIVÉ — Thème sombre, haptique, hors ligne. Hôtes, clés API et URLs caméra chiffrés sur l'appareil, ne quittent jamais votre réseau.

COMMENT ÇA MARCHE
1) Installez OctoPulse et rejoignez le même Wi-Fi que OctoPrint.
2) Appuyez sur « Découvrir les imprimantes », choisissez la vôtre, Associez & Approuvez dans OctoPrint.
3) Surveillez, regardez la caméra, mettez en pause/arrêtez et lancez la prochaine impression.

COMPATIBILITÉ
Fonctionne avec toute imprimante sous OctoPrint — y compris OctoPi sur Raspberry Pi. Si vous ouvrez OctoPrint dans le navigateur, OctoPulse peut se connecter. Pour l'accès distant, utilisez votre URL VPN/reverse proxy.

VIE PRIVÉE D'ABORD
• Pas de compte, pas d'inscription.
• Fichiers d'impression, G-code et flux caméra ne vont jamais à nos serveurs.
• Clés API chiffrées avec Android Keystore.
• Pas de localisation précise — la découverte scanne seulement votre sous-réseau.
Politique complète : https://chartmann1590.github.io/octopulse/privacy.html

PUBS & TARIFS
OctoPulse est gratuit et financé par Google AdMob. Petite bannière ancrée et parfois plein écran après la configuration — jamais pendant l'impression. Réinitialisez l'ID publicitaire dans Paramètres Android → Confidentialité → Annonces. Voir Politique §4.

AUTORISATIONS
INTERNET, ACCESS_NETWORK_STATE, ACCESS_WIFI_STATE, CHANGE_WIFI_MULTICAST_STATE (mDNS), POST_NOTIFICATIONS, RECEIVE_BOOT_COMPLETED, VIBRATE, AD_ID. Pas de localisation, caméra ou contacts.

OPEN SOURCE & SUPPORT
OctoPulse est open source (MIT) sur github.com/chartmann1590/octopulse. Mettez une étoile, signalez des issues ou sponsorisez : buymeacoffee.com/charleshartmann

SUPPORT
Problème ou idée ? Ouvrez une issue GitHub ou écrivez à hello@octopulse.app

—
Non affilié à OctoPrint. OctoPrint est marque de ses propriétaires. Ender, Prusa, Bambu sont marques respectives."""
    },
    "es-ES": {
        "title": "OctoPulse: OctoPrint",
        "short": "Controla tu impresora 3D OctoPrint desde el móvil. Supervisa e imprime por Wi-Fi.",
        "full": """Tu OctoPrint en el bolsillo. Supervisa, controla e imprime desde tu móvil Android — sin cuenta necesaria.

OctoPulse es el compañero gratuito y privado para OctoPrint. Comprueba el progreso, mira la cámara y gestiona impresiones en cualquier lugar de tu Wi-Fi. Funciona con OctoPi, Ender 3, Prusa, Bambu (con OctoPrint) y cualquier impresora con OctoPrint.

¿POR QUÉ OCTOPULSE?
• Gratis y código abierto — sin suscripción, sin nube. Los datos permanecen entre tu móvil y tu impresora.
• Hecho para makers — rápido, moderno y pensado para granjas de impresión y aficionados.
• Anuncios respetuosos — pequeño banner + intersticial ocasional tras la configuración. Nunca durante la impresión.

FUNCIONES PRINCIPALES
🔍 DESCUBRIMIENTO AUTOMÁTICO — Encuentra OctoPrint en tu Wi-Fi en segundos vía mDNS/Bonjour, SSDP y escaneo inteligente de subred. Sin escribir IPs. Verificación estricta, solo impresoras reales aparecen.
⚡ EMPAREJAMIENTO CON 1 TOQUE — Conexión con Application Keys oficiales. Toca tu impresora → Aprobar en OctoPrint → listo. Sin copiar claves API.
📊 PANEL DE UN VISTAZO — Todas las impresoras en un solo lugar: estado, %, tiempo restante, temperaturas boquilla y cama. Desliza para actualizar.
📷 CÁMARA EN VIVO — Streaming MJPEG/snapshot con espejo, rotación y reconexión automática. Vigila las primeras capas desde el sofá o el taller.
🎛️ CONTROL TOTAL — Mover X/Y/Z, home, extruir/retraer, temperaturas boquilla/cama, ventilador, parada de emergencia y enviar G-code por terminal.
📐 VISTA PREVIA G-CODE — Visor 2D y 3D de capas con pellizcar-zoom y órbita. Revisa capas antes de imprimir.
📄 GESTOR DE ARCHIVOS — Navega archivos OctoPrint, previsualiza, inicia una impresión o elimina.
🔔 ALERTAS INTELIGENTES — Notificación al terminar, fallar o al 25/50/75/90 %. Por impresora y sondeo en segundo plano. Respeta No molestar.
🌙 PULIDO Y PRIVADO — Tema oscuro, háptica, sin conexión. Hosts, claves API y URLs de cámara cifrados en el dispositivo, nunca salen de tu red.

CÓMO FUNCIONA
1) Instala OctoPulse y únete al mismo Wi-Fi que OctoPrint.
2) Toca «Descubrir impresoras», elige la tuya, Emparejar y Aprobar en OctoPrint.
3) Supervisa, mira la cámara, pausa/detén y comienza la siguiente impresión.

COMPATIBILIDAD
Funciona con cualquier impresora con OctoPrint — incluido OctoPi en Raspberry Pi. Si puedes abrir OctoPrint en el navegador, OctoPulse puede conectarse. Para acceso remoto, usa tu URL VPN/reverse proxy.

PRIVACIDAD PRIMERO
• Sin cuenta, sin registro.
• Archivos de impresión, G-code y cámara nunca van a nuestros servidores.
• Claves API cifradas con Android Keystore.
• Sin ubicación precisa — el descubrimiento solo escanea tu subred.
Política completa: https://chartmann1590.github.io/octopulse/privacy.html

ANUNCIOS Y PRECIOS
OctoPulse es gratis y con anuncios vía Google AdMob. Pequeño banner anclado y a veces pantalla completa tras la configuración — nunca imprimiendo. Restablece tu ID de publicidad en Ajustes Android → Privacidad → Anuncios. Ver Política §4.

PERMISOS EXPLICADOS
INTERNET, ACCESS_NETWORK_STATE, ACCESS_WIFI_STATE, CHANGE_WIFI_MULTICAST_STATE (mDNS), POST_NOTIFICATIONS, RECEIVE_BOOT_COMPLETED, VIBRATE, AD_ID. Sin ubicación, cámara o contactos.

CÓDIGO ABIERTO Y SOPORTE
OctoPulse es código abierto (MIT) en github.com/chartmann1590/octopulse. Da una estrella, reporta problemas o patrocina: buymeacoffee.com/charleshartmann

SOPORTE
¿Problemas o ideas? Abre un issue en GitHub o escribe a hello@octopulse.app

—
No afiliado a OctoPrint. OctoPrint es marca de sus propietarios. Ender, Prusa y Bambu son marcas de sus dueños."""
    },
    "it-IT": {
        "title": "OctoPulse: OctoPrint",
        "short": "Controlla la tua stampante 3D OctoPrint dal telefono. Monitora e stampa in Wi-Fi.",
        "full": """Il tuo OctoPrint in tasca. Monitora, controlla e stampa dal tuo telefono Android — nessun account necessario.

OctoPulse è il companion gratuito e attento alla privacy per OctoPrint. Controlla l'avanzamento, guarda la fotocamera e gestisci le stampe ovunque nel tuo Wi-Fi. Funziona con OctoPi, Ender 3, Prusa, Bambu (con OctoPrint) e qualsiasi stampante con OctoPrint.

PERCHÉ OCTOPULSE?
• Gratis e open source — nessun abbonamento, nessun cloud. I dati restano tra telefono e stampante.
• Fatto per i maker — veloce, moderno, pensato per farm di stampa e hobbisti.
• Pubblicità rispettose — piccolo banner + occasionale interstitial dopo il setup. Mai durante la stampa.

FUNZIONALITÀ PRINCIPALI
🔍 RILEVAMENTO AUTOMATICO — Trova OctoPrint nel tuo Wi-Fi in secondi via mDNS/Bonjour, SSDP e scansione intelligente della sottorete. Senza digitare IP. Verifica rigorosa, solo stampanti reali appaiono.
⚡ ABBINAMENTO IN 1 TOCCO — Connessione con Application Keys ufficiali. Tocca la stampante → Approva in OctoPrint → fatto. Niente chiavi API da copiare.
📊 DASHBOARD A COLPO D'OCCHIO — Tutte le stampanti in un posto: stato, %, tempo residuo, temperature ugello e letto. Trascina per aggiornare.
📷 FOTOCAMERA LIVE — Streaming MJPEG/snapshot con flip, rotazione e riconnessione automatica. Tieni d'occhio i primi layer dal divano o dal laboratorio.
🎛️ CONTROLLO TOTALE — Muovi X/Y/Z, home, estrudi/ritrai, temperature ugello/letto, ventola, arresto di emergenza e invia G-code via terminale.
📐 ANTEPRIMA G-CODE — Visualizzatore 2D e 3D dei layer con pinch-zoom e orbita. Controlla i layer prima di stampare.
📄 GESTORE FILE — Sfoglia i file OctoPrint, anteprima, avvia una stampa o elimina.
🔔 AVVISI INTELLIGENTI — Notifica a stampa finita, errore o 25/50/75/90 %. Per stampante e polling in background. Rispetta Non disturbare.
🌙 CURATO E PRIVATO — Tema scuro, aptica, offline. Host, chiavi API e URL fotocamera cifrati sul dispositivo, non lasciano mai la tua rete.

COME FUNZIONA
1) Installa OctoPulse e unisciti allo stesso Wi-Fi di OctoPrint.
2) Tocca «Scopri stampanti», scegli la tua, Associa e Approva in OctoPrint.
3) Monitora, guarda la camera, metti in pausa/ferma e avvia la prossima stampa.

COMPATIBILITÀ
Funziona con qualsiasi stampante con OctoPrint — incluso OctoPi su Raspberry Pi. Se apri OctoPrint nel browser, OctoPulse può connettersi. Per accesso remoto, usa il tuo URL VPN/reverse proxy.

PRIVACY PRIMA DI TUTTO
• Nessun account, nessuna registrazione.
• File di stampa, G-code e flussi camera non vanno mai ai nostri server.
• Chiavi API cifrate con Android Keystore.
• Nessuna posizione precisa — il rilevamento scansiona solo la tua sottorete.
Informativa completa: https://chartmann1590.github.io/octopulse/privacy.html

PUBBLICITÀ E PREZZI
OctoPulse è gratis e con annunci tramite Google AdMob. Piccolo banner ancorato e a volte schermo intero dopo il setup — mai durante la stampa. Reimposta l'ID pubblicitario in Impostazioni Android → Privacy → Annunci. Vedi Informativa §4.

PERMESSI SPIEGATI
INTERNET, ACCESS_NETWORK_STATE, ACCESS_WIFI_STATE, CHANGE_WIFI_MULTICAST_STATE (mDNS), POST_NOTIFICATIONS, RECEIVE_BOOT_COMPLETED, VIBRATE, AD_ID. Nessuna posizione, fotocamera o contatti.

OPEN SOURCE E SUPPORTO
OctoPulse è open source (MIT) su github.com/chartmann1590/octopulse. Metti una stella, segnala problemi o sponsorizza: buymeacoffee.com/charleshartmann

SUPPORTO
Problemi o idee? Apri un issue su GitHub o scrivi a hello@octopulse.app

—
Non affiliato a OctoPrint. OctoPrint è marchio dei proprietari. Ender, Prusa e Bambu sono marchi rispettivi."""
    },
    "pt-BR": {
        "title": "OctoPulse: OctoPrint",
        "short": "Controle sua impressora 3D OctoPrint pelo celular. Monitore e imprima no Wi-Fi.",
        "full": """Seu OctoPrint no bolso. Monitore, controle e imprima do seu celular Android — sem conta necessária.

OctoPulse é o companheiro gratuito e privado para OctoPrint. Verifique o progresso, veja a câmera e gerencie impressões em qualquer lugar do seu Wi-Fi. Funciona com OctoPi, Ender 3, Prusa, Bambu (com OctoPrint) e qualquer impressora com OctoPrint.

POR QUE OCTOPULSE?
• Grátis e código aberto — sem assinatura, sem nuvem. Dados ficam entre seu celular e sua impressora.
• Feito para makers — rápido, moderno e pensado para fazendas de impressão e hobby.
• Anúncios respeitosos — pequeno banner + intersticial ocasional após a configuração. Nunca durante a impressão.

PRINCIPAIS RECURSOS
🔍 DESCOBERTA AUTOMÁTICA — Encontra OctoPrint no seu Wi-Fi em segundos via mDNS/Bonjour, SSDP e varredura inteligente de sub-rede. Sem digitar IPs. Verificação rigorosa, só impressoras reais aparecem.
⚡ EMPARELHAMENTO COM 1 TOQUE — Conexão com Application Keys oficiais. Toque na sua impressora → Aprove no OctoPrint → pronto. Sem copiar chaves API.
📊 PAINEL EM UM OLHAR — Todas as impressoras em um só lugar: status, %, tempo restante, temperaturas do bico e mesa. Puxe para atualizar.
📷 CÂMERA AO VIVO — Streaming MJPEG/snapshot com espelho, rotação e reconexão automática. Fique de olho nas primeiras camadas do sofá ou da oficina.
🎛️ CONTROLE TOTAL — Mover X/Y/Z, home, extrudar/retrair, temperaturas do bico/mesa, ventoinha, parada de emergência e enviar G-code via terminal.
📐 PRÉVIA G-CODE — Visualizador 2D e 3D de camadas com pinça-zoom e órbita. Verifique camadas antes de imprimir.
📄 GERENCIADOR DE ARQUIVOS — Navegue arquivos OctoPrint, pré-visualize, inicie uma impressão ou exclua.
🔔 ALERTAS INTELIGENTES — Notificação ao terminar, falhar ou 25/50/75/90 %. Por impressora e polling em segundo plano. Respeita Não perturbe.
🌙 POLIDO E PRIVADO — Tema escuro, háptico, offline. Hosts, chaves API e URLs de câmera criptografados no dispositivo, nunca saem da sua rede.

COMO FUNCIONA
1) Instale o OctoPulse e entre no mesmo Wi-Fi do OctoPrint.
2) Toque em «Descobrir impressoras», escolha a sua, Emparelhar e Aprovar no OctoPrint.
3) Monitore, veja a câmera, pause/pare e inicie a próxima impressão.

COMPATIBILIDADE
Funciona com qualquer impressora com OctoPrint — incluindo OctoPi no Raspberry Pi. Se você abre OctoPrint no navegador, o OctoPulse pode conectar. Para acesso remoto, use sua URL VPN/reverse proxy.

PRIVACIDADE EM PRIMEIRO LUGAR
• Sem conta, sem cadastro.
• Arquivos de impressão, G-code e fluxos de câmera nunca vão para nossos servidores.
• Chaves API criptografadas com Android Keystore.
• Sem localização precisa — a descoberta só varre sua sub-rede.
Política completa: https://chartmann1590.github.io/octopulse/privacy.html

ANÚNCIOS E PREÇOS
OctoPulse é grátis e com anúncios via Google AdMob. Pequeno banner ancorado e às vezes tela cheia após a configuração — nunca imprimindo. Redefina seu ID de publicidade em Configurações Android → Privacidade → Anúncios. Ver Política §4.

PERMISSÕES EXPLICADAS
INTERNET, ACCESS_NETWORK_STATE, ACCESS_WIFI_STATE, CHANGE_WIFI_MULTICAST_STATE (mDNS), POST_NOTIFICATIONS, RECEIVE_BOOT_COMPLETED, VIBRATE, AD_ID. Sem localização, câmera ou contatos.

CÓDIGO ABERTO E SUPORTE
OctoPulse é código aberto (MIT) em github.com/chartmann1590/octopulse. Dê uma estrela, reporte problemas ou patrocine: buymeacoffee.com/charleshartmann

SUPORTE
Problemas ou ideias? Abra um issue no GitHub ou escreva para hello@octopulse.app

—
Não afiliado ao OctoPrint. OctoPrint é marca de seus proprietários. Ender, Prusa e Bambu são marcas respectivas."""
    },
    "ja-JP": {
        "title": "OctoPulse: OctoPrint",
        "short": "スマホからOctoPrint 3Dプリンターを操作。Wi-Fiで監視＆印刷。",
        "full": """ポケットの中のOctoPrint。Androidスマホから監視・制御・印刷 — アカウント不要。

OctoPulseはOctoPrint用の無料でプライバシー重視のコンパニオンです。Wi-Fi上のどこからでも進捗確認、カメラ視聴、印刷管理ができます。OctoPi、Ender 3、Prusa、Bambu（OctoPrint使用）やOctoPrintが動くあらゆるプリンターで動作します。

なぜOCTOPULSEか？
• 無料＆オープンソース — サブスクなし、クラウドなし。データはスマホとプリンターの間に留まります。
• メーカーのために — 高速、モダン、実際のプリントファームやホビー向けに設計。
• 控えめな広告 — 小さなバナー＋セットアップ後に時々全画面広告。印刷中は表示されません。

主な機能
🔍 自動検出 — mDNS/Bonjour、SSDP、スマートサブネットスキャンで数秒でWi-Fi上のOctoPrintを発見。IP入力不要。厳格な検証で本物のプリンターのみ表示。
⚡ ワンタップペアリング — 公式Application Keysで接続。プリンターをタップ → OctoPrintで承認 → 完了。APIキーのコピー不要。
📊 一目でわかるダッシュボード — すべてのプリンターを一箇所で：ステータス、進捗％、残り時間、ノズル＆ベッド温度。引っ張って更新。
📷 ライブカメラ — 反転・回転・自動再接続対応のMJPEG/スナップショット配信。ソファや作業場からファーストレイヤーを監視。
🎛️ フルコントロール — X/Y/Z移動、ホーム、押し出し/引き戻し、ノズル/ベッド温度、ファン、緊急停止、ターミナルからG-code送信。
📐 G-CODEプレビュー — ピンチズームとオービット対応の2D＆3Dレイヤービューワー。印刷前にレイヤーを確認。
📄 ファイルマネージャー — OctoPrintファイルを閲覧、プレビュー、印刷開始や削除。
🔔 スマートアラート — 印刷完了、失敗、25/50/75/90％で通知。プリンターごとに切替、バックグラウンドポーリング。おやすみモード尊重。
🌙 洗練＆プライベート — ダークテーマ、触覚、オフライン対応。ホスト、APIキー、カメラURLはデバイス上で暗号化、ネットワークから出ません。

使い方
1) OctoPulseをインストールし、OctoPrintと同じWi-Fiに参加。
2) 「Wi-Fiでプリンターを探す」をタップ、選択、ペアリングしてOctoPrintで承認。
3) 進捗を監視、カメラを見て、必要なら一時停止/停止し、次の印刷を開始。

互換性
OctoPrintが動くあらゆるプリンターで動作 — Raspberry Pi上のOctoPiを含む。ブラウザでOctoPrintを開けるなら、OctoPulseは接続できます。リモートアクセスはVPN/リバースプロキシURLを使用。

プライバシー最優先
• アカウント不要、サインアップなし。
• 印刷ファイル、G-code、カメラ映像は当社サーバーに送信されません。
• APIキーはAndroid Keystoreで暗号化保存。
• 正確な位置情報なし — 検出はローカルサブネットのみスキャン。
完全なプライバシーポリシー: https://chartmann1590.github.io/octopulse/privacy.html

広告と価格
OctoPulseは無料でGoogle AdMobによる広告で運営。小さな固定バナーと時々全画面広告（セットアップ後）— 印刷中はなし。広告IDはAndroid設定 → プライバシー → 広告でリセット/削除できます。詳細はプライバシーポリシー§4。

権限の説明
INTERNET、ACCESS_NETWORK_STATE、ACCESS_WIFI_STATE、CHANGE_WIFI_MULTICAST_STATE（mDNS用）、POST_NOTIFICATIONS、RECEIVE_BOOT_COMPLETED、VIBRATE、AD_ID。位置情報、カメラ、連絡先は不要。

オープンソース＆サポート
OctoPulseはMITライセンスのオープンソース（github.com/chartmann1590/octopulse）。スターを付け、Issueを報告、または支援: buymeacoffee.com/charleshartmann

サポート
問題やアイデア？GitHubでIssueを作成するか hello@octopulse.app にメールしてください

—
OctoPrintとは無関係。OctoPrintは所有者の登録商標です。Ender、Prusa、Bambuはそれぞれの商標です。"""
    },
    "ko-KR": {
        "title": "OctoPulse: OctoPrint",
        "short": "스마트폰으로 OctoPrint 3D 프린터를 제어하세요. Wi-Fi로 모니터링 및 출력.",
        "full": """주머니 속 OctoPrint. Android 스마트폰에서 모니터링, 제어 및 출력 — 계정 불필요.

OctoPulse는 OctoPrint를 위한 무료, 개인정보 보호 중심의 컴패니언입니다. Wi-Fi 어디서나 진행률을 확인하고, 카메라를 보고, 출력을 관리하세요. OctoPi, Ender 3, Prusa, Bambu(OctoPrint 사용) 및 OctoPrint가 실행되는 모든 프린터에서 작동합니다.

왜 OCTOPULSE인가?
• 무료 및 오픈소스 — 구독 없음, 클라우드 없음. 데이터는 스마트폰과 프린터 사이에 머무릅니다.
• 메이커를 위해 — 빠르고 현대적이며 실제 프린트 팜과 취미 사용자를 위해 제작.
• 존중하는 광고 — 작은 배너 + 설정 후 가끔 전면 광고. 출력 중에는 표시되지 않습니다.

주요 기능
🔍 자동 검색 — mDNS/Bonjour, SSDP 및 스마트 서브넷 스캔으로 Wi-Fi에서 OctoPrint를 몇 초 만에 찾습니다. IP 입력 불필요. 엄격한 검증으로 실제 프린터만 표시.
⚡ 원탭 페어링 — 공식 Application Keys로 연결. 프린터를 탭 → OctoPrint에서 승인 → 완료. API 키 복사 불필요.
📊 한눈에 보는 대시보드 — 모든 프린터를 한곳에서: 상태, 진행률 %, 남은 시간, 노즐 및 베드 온도. 당겨서 새로고침.
📷 라이브 카메라 — 뒤집기, 회전, 자동 재연결을 지원하는 MJPEG/스냅샷 스트리밍. 소파나 작업장에서 첫 레이어를 지켜보세요.
🎛️ 전체 제어 — X/Y/Z 이동, 홈, 압출/리트랙트, 노즐/베드 온도, 팬, 비상 정지 및 터미널로 G-code 전송.
📐 G-CODE 미리보기 — 핀치 줌 및 궤도 지원 2D 및 3D 레이어 뷰어. 출력 전 레이어를 확인하세요.
📄 파일 관리자 — OctoPrint 파일을 탐색하고, 미리보고, 출력을 시작하거나 삭제하세요.
🔔 스마트 알림 — 출력 완료, 실패 또는 25/50/75/90%에서 알림. 프린터별 전환 및 백그라운드 폴링. 방해 금지 모드 준수.
🌙 세련되고 프라이빗 — 다크 테마, 햅틱, 오프라인 처리. 호스트, API 키 및 카메라 URL은 기기에서 암호화되어 네트워크를 떠나지 않습니다.

사용 방법
1) OctoPulse를 설치하고 OctoPrint와 동일한 Wi-Fi에 연결하세요.
2) “Wi-Fi에서 프린터 찾기”를 탭하고, 선택한 다음 OctoPrint에서 페어링 및 승인하세요.
3) 진행률을 모니터링하고, 카메라를 보고, 필요시 일시정지/중지하고 다음 출력을 시작하세요.

호환성
OctoPrint가 실행되는 모든 프린터에서 작동 — Raspberry Pi의 OctoPi 포함. 브라우저에서 OctoPrint를 열 수 있으면 OctoPulse가 연결할 수 있습니다. 원격 액세스는 VPN/리버스 프록시 URL을 사용하세요.

개인정보 우선
• 계정 없음, 가입 없음.
• 출력 파일, G-code 및 카메라 피드는 당사 서버로 전송되지 않습니다.
• API 키는 Android Keystore로 암호화되어 저장됩니다.
• 정확한 위치 없음 — 검색은 로컬 서브넷만 스캔합니다.
전체 개인정보 처리방침: https://chartmann1590.github.io/octopulse/privacy.html

광고 및 가격
OctoPulse는 Google AdMob을 통한 광고로 무료로 제공됩니다. 작은 고정 배너와 설정 후 가끔 전면 광고 — 출력 중에는 표시되지 않습니다. 광고 ID는 Android 설정 → 개인정보 보호 → 광고에서 재설정/삭제할 수 있습니다. 자세한 내용은 개인정보 처리방침 §4 참조.

권한 설명
INTERNET, ACCESS_NETWORK_STATE, ACCESS_WIFI_STATE, CHANGE_WIFI_MULTICAST_STATE(mDNS용), POST_NOTIFICATIONS, RECEIVE_BOOT_COMPLETED, VIBRATE, AD_ID. 위치, 카메라 또는 연락처 없음.

오픈 소스 및 지원
OctoPulse는 MIT 라이선스 오픈소스입니다(github.com/chartmann1590/octopulse). 스타를 누르고, 이슈를 보고하거나 후원하세요: buymeacoffee.com/charleshartmann

지원
문제나 아이디어가 있나요? GitHub에 이슈를 열거나 hello@octopulse.app로 이메일을 보내세요

—
OctoPrint와 제휴하지 않음. OctoPrint는 소유자의 등록 상표입니다. Ender, Prusa, Bambu는 각 소유자의 상표입니다."""
    },
    "nl-NL": {
        "title": "OctoPulse: OctoPrint",
        "short": "Bedien je OctoPrint 3D-printer vanaf je telefoon. Monitor en print via Wi-Fi.",
        "full": """Je OctoPrint in je broekzak. Monitor, bedien en print vanaf je Android-telefoon — geen account nodig.

OctoPulse is de gratis, privacyvriendelijke metgezel voor OctoPrint. Controleer voortgang, bekijk de camera en beheer prints overal op je Wi-Fi. Werkt met OctoPi, Ender 3, Prusa, Bambu (met OctoPrint) en elke printer met OctoPrint.

WAAROM OCTOPULSE?
• Gratis & open source — geen abonnement, geen cloud. Gegevens blijven tussen je telefoon en je printer.
• Gemaakt voor makers — snel, modern en gebouwd voor echte printfarms en hobbyisten.
• Respectvolle advertenties — kleine banner + occasionele interstitial na setup. Nooit tijdens het printen.

BELANGRIJKSTE FUNCTIES
🔍 AUTO-DETECTIE — Vindt OctoPrint in seconden op je Wi-Fi via mDNS/Bonjour, SSDP en slimme subnet-scan. Geen IP-adressen typen. Strikte OctoPrint-verificatie, alleen echte printers verschijnen.
⚡ 1-TIK KOPPELING — Verbindt via officiële Application Keys. Tik je printer → Goedkeuren in OctoPrint → klaar. Geen API-sleutels kopiëren.
📊 DASHBOARD IN ÉÉN OOGOPSLAG — Alle printers op één plek: status, voortgang %, resterende tijd, nozzle & bed temperaturen. Trek om te vernieuwen.
📷 LIVE CAMERA — MJPEG/snapshot streaming met flip, roteren en auto-reconnect. Houd eerste lagen in de gaten vanaf de bank of werkplaats.
🎛️ VOLLEDIGE BEDIENING — Jog X/Y/Z, home assen, extrude/retract, nozzle/bed temperaturen, ventilator, noodstop en G-code via terminal sturen.
📐 G-CODE PREVIEW — 2D & 3D laagviewer met pinch-zoom en orbit. Controleer lagen voor het printen.
📄 BESTANDSBEHEER — Browse OctoPrint bestanden, preview, start een print of verwijder.
🔔 SLIMME MELDINGEN — Melding bij print klaar, mislukt of 25/50/75/90 %. Per printer instelbaar en background polling. Respecteert Niet storen.
🌙 VERZORGD & PRIVÉ — Donker thema, haptiek, offline afhandeling. Hosts, API-sleutels en camera-URL's versleuteld op apparaat, verlaten nooit je netwerk.

HOE HET WERKT
1) Installeer OctoPulse en ga op hetzelfde Wi-Fi als je OctoPrint.
2) Tik “Printers zoeken”, kies de jouwe, tik Koppelen & Goedkeuren in OctoPrint.
3) Monitor voortgang, bekijk camera, pauzeer/stop indien nodig en start je volgende print.

COMPATIBILITEIT
Werkt met elke printer met OctoPrint — inclusief OctoPi op Raspberry Pi. Als je OctoPrint in de browser kunt openen, kan OctoPulse verbinden. Voor toegang op afstand gebruik je VPN/reverse proxy URL.

PRIVACY EERST
• Geen account, geen aanmelding.
• Printbestanden, G-code en camerabeelden gaan nooit naar onze servers.
• API-sleutels versleuteld met Android Keystore.
• Geen precieze locatie — detectie scant alleen je lokale subnet.
Volledig privacybeleid: https://chartmann1590.github.io/octopulse/privacy.html

ADVERTENTIES & PRIJZEN
OctoPulse is gratis en advertentie-ondersteund via Google AdMob. Kleine verankerde banner en soms fullscreen na setup — nooit tijdens het printen. Je kunt je Advertising ID resetten/verwijderen in Android Instellingen → Privacy → Advertenties. Zie Privacybeleid §4.

MACHTIGINGEN UITGELEGD
INTERNET, ACCESS_NETWORK_STATE, ACCESS_WIFI_STATE, CHANGE_WIFI_MULTICAST_STATE (voor mDNS), POST_NOTIFICATIONS, RECEIVE_BOOT_COMPLETED, VIBRATE, AD_ID. Geen locatie, camera of contacten.

OPEN SOURCE & ONDERSTEUNING
OctoPulse is open source (MIT) op github.com/chartmann1590/octopulse. Geef een ster, meld issues of sponsor: buymeacoffee.com/charleshartmann

ONDERSTEUNING
Problemen of ideeën? Open een issue op GitHub of mail naar hello@octopulse.app

—
Niet gelieerd aan OctoPrint. OctoPrint is handelsmerk van eigenaren. Ender, Prusa en Bambu zijn handelsmerken van respectieve eigenaren."""
    },
    "pl-PL": {
        "title": "OctoPulse: OctoPrint",
        "short": "Steruj drukarką 3D OctoPrint z telefonu. Monitoruj i drukuj przez Wi-Fi.",
        "full": """Twój OctoPrint w kieszeni. Monitoruj, steruj i drukuj z telefonu z Androidem — bez konta.

OctoPulse to darmowy, prywatny towarzysz dla OctoPrint. Sprawdzaj postęp, oglądaj kamerę i zarządzaj wydrukami wszędzie w sieci Wi-Fi. Działa z OctoPi, Ender 3, Prusa, Bambu (z OctoPrint) i każdą drukarką z OctoPrint.

DLACZEGO OCTOPULSE?
• Darmowy i open source — bez subskrypcji, bez chmury. Dane zostają między telefonem a drukarką.
• Stworzony dla makerów — szybki, nowoczesny, zbudowany dla farm drukarek i hobbystów.
• Szanujące reklamy — mały baner + okazjonalny interstitial po konfiguracji. Nigdy podczas drukowania.

KLUCZOWE FUNKCJE
🔍 AUTO-WYKRYWANIE — Znajduje OctoPrint w Wi-Fi w sekundy przez mDNS/Bonjour, SSDP i inteligentne skanowanie podsieci. Bez wpisywania IP. Surowa weryfikacja OctoPrint, tylko prawdziwe drukarki się pojawiają.
⚡ PAROWANIE JEDNYM DOTKNIĘCIEM — Łączy przez oficjalne Application Keys. Dotknij drukarkę → Zatwierdź w OctoPrint → gotowe. Bez kopiowania kluczy API.
📊 PULPIT NA JEDEN RZUT OKA — Wszystkie drukarki w jednym miejscu: status, %, czas pozostały, temperatury dyszy i stołu. Przeciągnij aby odświeżyć.
📷 KAMERA NA ŻYWO — Streaming MJPEG/snapshot z obracaniem, flip i auto-reconnect. Pilnuj pierwszych warstw z kanapy lub warsztatu.
🎛️ PEŁNA KONTROLA — Przesuw X/Y/Z, home, ekstruzja/retrakcja, temperatury dyszy/stołu, wentylator, awaryjne zatrzymanie i wysyłanie G-code przez terminal.
📐 PODGLĄD G-CODE — Przeglądarka warstw 2D i 3D z pinch-zoom i orbitą. Sprawdź warstwy przed drukiem.
📄 MENEDŻER PLIKÓW — Przeglądaj pliki OctoPrint, podgląd, rozpocznij wydruk lub usuń.
🔔 INTELIGENTNE ALERTY — Powiadomienie gdy wydruk skończony, nieudany lub 25/50/75/90 %. Przełączane per drukarka i polling w tle. Szanuje Nie przeszkadzać.
🌙 DOPRACOWANY I PRYWATNY — Ciemny motyw, haptyka, obsługa offline. Hosty, klucze API i URL-e kamery zaszyfrowane na urządzeniu, nigdy nie opuszczają twojej sieci.

JAK TO DZIAŁA
1) Zainstaluj OctoPulse i dołącz do tego samego Wi-Fi co OctoPrint.
2) Dotknij „Odkryj drukarki”, wybierz swoją, dotknij Paruj i Zatwierdź w OctoPrint.
3) Monitoruj postęp, oglądaj kamerę, pauzuj/zatrzymaj w razie potrzeby i rozpocznij kolejny wydruk.

KOMPATYBILNOŚĆ
Działa z każdą drukarką z OctoPrint — w tym OctoPi na Raspberry Pi. Jeśli możesz otworzyć OctoPrint w przeglądarce, OctoPulse może się połączyć. Do zdalnego dostępu użyj swojego URL VPN/reverse proxy.

PRYWATNOŚĆ NAJWAŻNIEJSZA
• Brak konta, brak rejestracji.
• Pliki wydruku, G-code i strumienie kamery nigdy nie trafiają na nasze serwery.
• Klucze API zaszyfrowane Android Keystore.
• Brak dokładnej lokalizacji — wykrywanie skanuje tylko twoją lokalną podsieć.
Pełna polityka prywatności: https://chartmann1590.github.io/octopulse/privacy.html

REKLAMY I CENY
OctoPulse jest darmowy i z reklamami via Google AdMob. Mały zakotwiczony baner i czasem pełny ekran po konfiguracji — nigdy podczas drukowania. Możesz zresetować/usunąć Advertising ID w Ustawienia Android → Prywatność → Reklamy. Zobacz Politykę §4.

UPRAWNIENIA WYJAŚNIONE
INTERNET, ACCESS_NETWORK_STATE, ACCESS_WIFI_STATE, CHANGE_WIFI_MULTICAST_STATE (dla mDNS), POST_NOTIFICATIONS, RECEIVE_BOOT_COMPLETED, VIBRATE, AD_ID. Bez lokalizacji, kamery czy kontaktów.

OPEN SOURCE I WSPARCIE
OctoPulse jest open source (MIT) na github.com/chartmann1590/octopulse. Daj gwiazdkę, zgłoś problemy lub sponsoruj: buymeacoffee.com/charleshartmann

WSPARCIE
Problemy lub pomysły? Otwórz issue na GitHub lub napisz na hello@octopulse.app

—
Niepowiązany z OctoPrint. OctoPrint jest znakiem towarowym właścicieli. Ender, Prusa i Bambu są znakami towarowymi odpowiednich właścicieli."""
    },
}

# Write files
for lang, data in translations.items():
    # Use en-US full as fallback for en-GB if None
    if data["full"] is None:
        # Use en-US full with minor UK tweak (over -> over)
        en_full = (base/"store/listing/en-US/full_description.txt").read_text(encoding="utf-8")
        # UK: change "favorite" etc not needed, just use same
        data["full"] = en_full.replace("over Wi-Fi", "over Wi-Fi").replace("favorite", "favourite")
    # title/short/full + whats_new (use en-US whats_new translated briefly)
    out_dir = base/f"store/listing/{lang}"
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir/"title.txt").write_text(data["title"], encoding="utf-8")
    (out_dir/"short_description.txt").write_text(data["short"], encoding="utf-8")
    (out_dir/"full_description.txt").write_text(data["full"], encoding="utf-8")
    # whats_new - simple translation
    whats = {
        "de-DE": "Erstes Play Store Release von OctoPulse!\n\n• OctoPrint-Drucker vom Handy überwachen & steuern\n• Auto-Erkennung im WLAN + 1-Tipp-Kopplung\n• Live-Kamera, volle Kontrolle, G-Code Vorschau\n• Dateien & smarte Druck-Benachrichtigungen\n• Kostenlos mit respektvoller Werbung\n\nDanke fürs Testen — bitte hinterlasse eine Bewertung!",
        "fr-FR": "Première version Play Store d'OctoPulse !\n\n• Surveillez et contrôlez votre imprimante OctoPrint depuis votre téléphone\n• Découverte auto Wi-Fi + appairage en 1 tap\n• Caméra en direct, contrôle total, aperçu G-code\n• Fichiers et alertes intelligentes\n• Gratuit avec pubs respectueuses\n\nMerci d'essayer OctoPulse — laissez un avis !",
        "es-ES": "¡Versión inicial de OctoPulse en Play Store!\n\n• Supervisa y controla tu impresora OctoPrint desde el móvil\n• Descubrimiento Wi-Fi + emparejamiento con 1 toque\n• Cámara en vivo, control total, vista previa G-code\n• Archivos y alertas inteligentes\n• Gratis con anuncios respetuosos\n\n¡Gracias por probar OctoPulse — deja una reseña!",
        "it-IT": "Prima release di OctoPulse sul Play Store!\n\n• Monitora e controlla la tua stampante OctoPrint dal telefono\n• Rilevamento Wi-Fi + associazione con 1 tocco\n• Camera live, controllo totale, anteprima G-code\n• File e avvisi intelligenti\n• Gratis con pubblicità rispettose\n\nGrazie per aver provato OctoPulse — lascia una recensione!",
        "pt-BR": "Primeira versão do OctoPulse na Play Store!\n\n• Monitore e controle sua impressora OctoPrint pelo celular\n• Descoberta Wi-Fi + pareamento com 1 toque\n• Câmera ao vivo, controle total, prévia G-code\n• Arquivos e alertas inteligentes\n• Grátis com anúncios respeitosos\n\nObrigado por testar o OctoPulse — deixe uma avaliação!",
        "ja-JP": "OctoPulse Play Store初回リリース！\n\n• スマホからOctoPrintプリンターを監視・制御\n• Wi-Fi自動検出＋ワンタップペアリング\n• ライブカメラ、フルコントロール、G-codeプレビュー\n• ファイルとスマートアラート\n• 控えめな広告で無料\n\nお試しありがとうございます — レビューをお願いします！",
        "ko-KR": "OctoPulse Play Store 첫 출시!\n\n• 스마트폰으로 OctoPrint 프린터 모니터링 및 제어\n• Wi-Fi 자동 검색 + 원탭 페어링\n• 라이브 카메라, 전체 제어, G-code 미리보기\n• 파일 및 스마트 알림\n• 존중하는 광고로 무료\n\nOctoPulse를 사용해 주셔서 감사합니다 — 리뷰를 남겨주세요!",
        "nl-NL": "Eerste Play Store-release van OctoPulse!\n\n• Monitor en bedien je OctoPrint-printer vanaf je telefoon\n• Auto-detectie Wi-Fi + koppeling met 1 tik\n• Live camera, volledige bediening, G-code preview\n• Bestanden en slimme meldingen\n• Gratis met respectvolle advertenties\n\nBedankt voor het proberen van OctoPulse — laat een review achter!",
        "pl-PL": "Pierwsze wydanie OctoPulse w Play Store!\n\n• Monitoruj i steruj drukarką OctoPrint z telefonu\n• Auto-wykrywanie Wi-Fi + parowanie jednym dotknięciem\n• Kamera na żywo, pełna kontrola, podgląd G-code\n• Pliki i inteligentne alerty\n• Darmowy z szanującymi reklamami\n\nDzięki za wypróbowanie OctoPulse — zostaw recenzję!",
        "en-GB": (base/"store/listing/en-US/whats_new.txt").read_text(encoding="utf-8"),
    }
    w = whats.get(lang, (base/"store/listing/en-US/whats_new.txt").read_text(encoding="utf-8"))
    (out_dir/"whats_new.txt").write_text(w, encoding="utf-8")
    # also create fastlane metadata
    fast = base/f"fastlane/metadata/android/{lang}"
    fast.mkdir(parents=True, exist_ok=True)
    (fast/"title.txt").write_text(data["title"], encoding="utf-8")
    (fast/"short_description.txt").write_text(data["short"], encoding="utf-8")
    (fast/"full_description.txt").write_text(data["full"], encoding="utf-8")
    (fast/"video.txt").write_text((base/"store/listing/en-US/youtube_url.txt").read_text(encoding="utf-8"), encoding="utf-8")
    (fast/"changelogs").mkdir(parents=True, exist_ok=True)
    (fast/"changelogs/1.txt").write_text(w, encoding="utf-8")
    print(f"{lang}: title {len(data['title'])}/30, short {len(data['short'])}/80, full {len(data['full'])}")

# Copy images for each language (Play requires at least en-US images, but we can reuse same images for all langs)
import shutil
for lang in translations.keys():
    src_icon = base/"store/assets/icon-512.png"
    src_fg = base/"store/assets/feature-graphic-1024x500.png"
    src_phone_dir = base/"store/assets/screenshots/phone"
    dst_img_dir = base/f"fastlane/metadata/android/{lang}/images"
    dst_img_dir.mkdir(parents=True, exist_ok=True)
    # copy icon and featureGraphic
    shutil.copy(src_icon, dst_img_dir/"icon.png")
    shutil.copy(src_fg, dst_img_dir/"featureGraphic.png")
    # phone screenshots
    ps_dir = dst_img_dir/"phoneScreenshots"
    ps_dir.mkdir(parents=True, exist_ok=True)
    for f in src_phone_dir.glob("*.png"):
        shutil.copy(f, ps_dir/f.name.replace("-phone", ""))
    print(f"{lang} images copied")

print("Done")
