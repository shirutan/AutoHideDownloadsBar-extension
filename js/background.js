// 'use strict';

console.log(i18n("app_name") + ": init background.js");

function dataForDraw(progress) {
   let color = (function () {
      // set gradient
      // https://developer.mozilla.org/en-US/docs/Web/CSS/color_value
      const percentageToHsl = (percentage) => {
         const optHue = {
            'startingHue': 0,
            'endingHue': 120,
            'saturation': 100,
            'lightness': 50
         };
         const hue = Math.round((percentage * (optHue.startingHue - optHue.endingHue)) + optHue.endingHue);
         return 'hsla(' + hue + ', ' + optHue.saturation + '%, ' + optHue.lightness + '%, 0.8)';
      }

      return App.sessionSettings['colorPicker'] || percentageToHsl(progress / 100)
   })();

   let dataDrawing = {
      'bg_color': color,
      'text_color': App.sessionSettings['colorPickerText'],
      'progressRatio': (+progress / 100),
      'text': progress,
   }

   switch (progress) {
      // if ask loadig
      case "!":
         dataDrawing.text = flashing(progress);
         dataDrawing.text_color = 'red';
         break;

      case Infinity:
         dataDrawing.text = flashing();
         break;
   }

   App.log('dataDrawing %s', JSON.stringify(dataDrawing));

   return dataDrawing;
}

function drawToolbarIcon(progress) {
   const dataForDrawing = dataForDraw(progress);
   const canvas = genCanvas();

   return drawProgressBar(dataForDrawing.progressRatio)
      .getImageData(0, 0, canvas.width, canvas.height);

   function drawProgressBar(ratio) {
      let ctx = canvas.getContext('2d');

      // add background
      ctx.fillStyle = 'hsla(0, 0%, 0%, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // add progress
      ctx.fillStyle = dataForDrawing.bg_color;
      ctx.fillRect(0, 0, parseInt(canvas.width * ratio), canvas.height);

      // add pt
      if (App.sessionSettings['typeIconInfo'] != 'svg_notext' && +dataForDrawing.text !== Infinity) {
         // create style text
         ctx.textAlign = 'center';
         ctx.textBaseline = 'middle';
         ctx.font = '11px Arial';
         // ctx.shadowColor = 'white';
         // ctx.shadowBlur = 1;
         ctx.fillStyle = dataForDrawing.text_color || '#888';
         ctx.fillText(dataForDrawing.text, (canvas.width / 2), (canvas.height / 2));
      }
      return ctx;
   }

   function genCanvas() {
      let cvs = document.createElement('canvas');
      // cvs.setAttribute('width', 19);
      // cvs.setAttribute('height', 6);
      cvs.width = 16;
      cvs.height = 16;
      return cvs;
   }

}

function flashing(text) {
   // let loadingSymbol = text ? Array.isArray(text) ? text : text.toString().split() : ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
   let loadingSymbol = text ? Array.isArray(text) ? text : text.toString().split() : ['›', '»', '›››'];
   App.circleNum = App.circleNum < loadingSymbol.length - 1 ? ++App.circleNum : 0;
   return loadingSymbol[App.circleNum];
}

function notificationCheck(item) {
   if (item && item.state && item.state.previous === 'in_progress') {
      let notiData = {},
         audioNotification;

      switch (item.state.current) {
         case 'complete':
            notiData.title = i18n("noti_download_complete");
            audioNotification = '/audio/complete.ogg';
            break;

         case 'interrupted':
            if (item.error.current == 'USER_CANCELED') {
               // notiData.title = i18n("noti_download_canceled");
            } else {
               notiData.title = i18n("noti_download_interrupted");
               notiData.requireInteraction = true; //cancel automatically closing
               notiData.icon = '/icons/dead.png';
               audioNotification = '/audio/interrupted.ogg';
            }
            break;

         // case 'in_progress':
         //    return;

         default:
            return;
      }

      if (Object.keys(notiData).length) {
         chrome.downloads.search({ id: item.id }, downloads => {
            let download = downloads[0];
            let timeLong = Date.parse(download.endTime) - Date.parse(download.startTime);
            let fileName = getFileNameFromPatch(download.filename);
            let minimum_download_time = 3000; // ms

            // skip notifity small file or small size
            if (download.fileSize <= 1 || timeLong < minimum_download_time) return;

            // App.log('timeLong %s', timeLong);
            // App.log('download.fileSize %s', download.fileSize);
            App.log('Done get download\n%s', JSON.stringify(download));

            notiData.title = `${i18n("noti_download_title")} ${notiData.title}`;
            notiData.body = fileName.toString().slice(0, 31) + "...";
            notiData.downloadId = item.id;
            notificationCreate(notiData, audioNotification && App.sessionSettings["soundNotification"] ? audioNotification : false);
         });
      }
   }

   function notificationCreate(options, audioPatch) {
      if (window.Notification && Notification.permission === "granted") {
         notification_show();
      } else {
         Notification.requestPermission().then(() => notification_show());
      }

      function notification_show() {
         const manifest = chrome.runtime.getManifest();
         new Notification(options.title || i18n("app_name"), {
            body: options.body || '',
            icon: options.icon || manifest.icons['48']
         }).onclick = () => this.close();

         // audio alert
         if (audioPatch) new Audio(audioPatch).play();
      }
   }

   // BUG in broken file open buttons!
   // function notificationCreate(options, audioPatch) {
   //    if (window.Notification && Notification.permission === "granted") {
   //       notification_show();
   //    } else {
   //       Notification.requestPermission().then(() => notification_show());
   //    }

   //    function notification_show() {
   //       const manifest = chrome.runtime.getManifest();
   //       let notiID;

   //       let notiBody = {
   //          type: "basic",
   //          iconUrl: options.icon || manifest.icons['48'],
   //          title: options.title || i18n("app_name"),
   //          message: options.body || '',
   //          // contextMessage: "contextMessage",
   //       }

   //       let permissionsObj = {
   //          permissions: ['downloads.open']
   //       }
   //       chrome.permissions.contains(permissionsObj, granted => {
   //          chrome.permissions.request(permissionsObj, granted => {
   //             notiBody.buttons = [{
   //                title: "open file",
   //                // iconUrl: "/path/to/yesIcon.png"
   //             }, {
   //                title: "open folder",
   //                // iconUrl: "/path/to/yesIcon.png"
   //             }];
   //          });
   //       });

   //       chrome.notifications.create('', notiBody, id => {
   //          notiID = id;
   //          // audio alert
   //          if (audioPatch) new Audio(audioPatch).play();
   //       });

   //       chrome.notifications.onButtonClicked.addListener(function (notificationId, buttonIndex) {
   //          console.log("onButtonClicked", notiID, notificationId, buttonIndex);
   //          if (notificationId === notiID) {
   //             console.log("button clicked", buttonIndex);
   //             switch (buttonIndex) {
   //                case 0:
   //                   chrome.downloads.open(notificationId);
   //                   break;
   //                case 1:
   //                   chrome.downloads.show(notificationId);
   //                   break;

   //                default:
   //                   console.warn('dont have button onlick action:', buttonIndex)
   //             }
   //             // chrome.notifications.clear(notificationId, function () {});
   //          }
   //       });
   //    }
   // }
}

function getDownloadProgress(callback) {
   let searchObj = {
      state: 'in_progress',
      paused: false,
      orderBy: ['-startTime']
   }

   chrome.downloads.search(searchObj, downloads => {
      let totalSize = 0,
         totalReceived = 0,
         totalProgress = 0,
         timeLeft = 0,
         countInfinity = 0,
         countActive = downloads.length;

      for (const download of downloads) {
         App.log('downloadItem: ' + JSON.stringify(download));

         totalReceived += download.bytesReceived;

         // skip crx
         if (download.mime === "application/x-chrome-extension") continue;

         // normal file
         if (download.fileSize || download.totalBytes) {
            let fileSize = download.fileSize || download.totalBytes;
            // let download_size = downloadItem.fileSize / 1024 / 1000;

            totalSize += fileSize;

            // totalProgress = Math.min(100, Math.floor(100 * totalReceived / totalSize)) || '--';
            totalProgress = Math.min(100, Math.floor(100 * totalReceived / totalSize)).toString();

            if (download.estimatedEndTime)
               timeLeft += new Date(download.estimatedEndTime) - new Date();
            // if undefined fileSize file

            // unknown size file
         } else {
            countInfinity += 1;
            App.log('find infinity %s', countInfinity);
            continue;
         }

         // skip downloaded file ask: keep/discard
         if (download.danger != "safe" && totalReceived === fileSize) return '!';
      };

      if (countActive) {
         // set toolbar title
         let titleOut = '';

         // size
         titleOut += bytesToSize(totalReceived) + " / ";
         titleOut += totalSize ? bytesToSize(totalSize) : "unknown size";

         if (totalSize) {
            // pt
            titleOut += "\n" + totalProgress + "%";
            // left time
            titleOut += " ~" + formatTimeLeft(timeLeft) + " left";
         }

         // count
         if (countActive > 1 || countInfinity) {
            titleOut += "\n" + 'active: ' + countActive;
            // let badgeText = countInfinity ? countInfinity + '/' + countActive : countActive
            // BrowserAct.badge.set.text(badgeText);

            // ignored
            if (countInfinity) {
               if (countInfinity === countActive) {
                  totalSize = false;
                  totalProgress = Infinity;
               } else {
                  titleOut += ' | ignore: ' + countInfinity;
               }
            }
         }

         BrowserAct.badge.set.title(titleOut);

      } else {
         // if ((item.state.current == 'complete') && item.endTime && !item.error) {
         // hide shelf-panel
         App.shelfTimeout = setTimeout(function () {
            App.log('setShelfEnabled');
            chrome.downloads.setShelfEnabled(false);
         }, Number(App.sessionSettings["shelfTimeout"]) * 1000 || 0);
         // }
      }

      App.log('countActive %s', countActive);
      App.log('totalProgress %s', totalProgress);

      // "chrome.downloads.search" doesn't allow to do it otherwise
      if (callback && typeof (callback) === 'function') return callback(totalProgress);
   });
}


const App = {

   // DEBUG: true,

   pulsar: statusDownload => {
      App.log('pulsar: %s', statusDownload);

      if (statusDownload && !App.isBusy) {
         App.log('setInterval');
         App.isBusy = true;
         App.temploadingMessage = setInterval(function () {
            App.log('setInterval RUN');
            getDownloadProgress(App.updateIndicate);
         }, 800);
         // cancellation of pending shelf-panel hiding
         App.shelfTimeout && clearTimeout(App.shelfTimeout);

      } else if (!statusDownload && App.isBusy) {
         App.log('clearInterval');
         App.isBusy = false;
         clearInterval(App.temploadingMessage);
         BrowserAct.badge.clear();
         // BrowserAct.badge.set.title('');

      } else App.log('pulsar ignore');
   },

   updateIndicate: pt => {
      if (App.sessionSettings['typeIconInfo'] != 'false') {
         BrowserAct.badge.set.icon({ 'imageData': drawToolbarIcon(pt) });
      }
   },

   // Saves/Load options to localStorage/chromeSync.
   storage: {
      load: () => {
         const callback = res => {
            App.log('storage %s', JSON.stringify(res));
            App.sessionSettings = res;

            App.updateBrowserBadgeAction();
         };
         // load store settings
         Storage.getParams(callback, 'sync');
      }
   },

   // Register the event handlers.
   eventListener: () => {
      // anim
      chrome.downloads.onCreated.addListener(item => {
         BrowserAct.badge.set.text('add');
         setTimeout(() => BrowserAct.badge.set.text(), 2000);
      });

      // worker
      chrome.downloads.onCreated.addListener(item => {
         chrome.downloads.setShelfEnabled(App.sessionSettings.shelfEnabled ? true : false);
      });

      chrome.downloads.onChanged.addListener(item => App.refresh(item));

      chrome.extension.onMessage.addListener((request, sender, sendResponse) => {
         switch (request.action) {
            case 'setOptions':
               App.sessionSettings = request.options;
               BrowserAct.badge.clear();
               App.updateBrowserBadgeAction();
               break;
         }
      });
   },

   refresh: item => {
      App.log('refresh');
      getDownloadProgress(App.pulsar);
      if (item && App.sessionSettings["showNotification"]) notificationCheck(item);

      let text = '';
      switch (item.state && item.state.current) {
         case 'complete': text = 'done'; break;

         case 'interrupted':
            if (item.error.current != 'USER_CANCELED') text = 'error';
            break;

         default:
            if (item.paused && item.paused.previous) text = '>';
            break;
      }

      if (text.length) {
         BrowserAct.badge.set.text(text);
         setTimeout(() => BrowserAct.badge.set.text(), 1000);
      }
   },

   // relation to removeListener/addListener
   openTab_chrome_downloads: tab => BrowserAct.tab.open('chrome://downloads/'),
   openTab_download_default_folder: () => chrome.downloads.showDefaultFolder(),

   updateBrowserBadgeAction: () => {
      const clearListener = act => { chrome.browserAction.onClicked.hasListener(act) && chrome.browserAction.onClicked.removeListener(act) };

      // // clear browserAction
      clearListener(App.openTab_download_default_folder);
      clearListener(App.openTab_chrome_downloads);
      chrome.browserAction.setPopup({ popup: '' });

      // called when the icon is clicked
      switch (App.sessionSettings["toolbarBehavior"]) {
         case 'popup':
            chrome.browserAction.setPopup({ 'popup': '/html/popup.html' });
            break;

         case 'download_default_folder':
            if (!chrome.browserAction.onClicked.hasListener(App.openTab_download_default_folder)) {
               chrome.browserAction.onClicked.addListener(App.openTab_download_default_folder);
            }
            break;

         // commented out because in the default options this parameter is set
         // otherwise, when installing without updating the parameters,
         // nothing will happen when you click on toolbar ico
         // case 'chrome_downloads':
         default:
            if (!chrome.browserAction.onClicked.hasListener(App.openTab_chrome_downloads)) {
               chrome.browserAction.onClicked.addListener(App.openTab_chrome_downloads);
            }
            break;
      }
   },

   init: () => {
      App.storage.load();
      App.eventListener();
      BrowserAct.badge.clear();
   },

   log: function (msg) {
      if (this.DEBUG) {
         for (let i = 1; i < arguments.length; i++) {
            msg = msg.replace(/%s/, arguments[i].toString().trim());
         }
         console.log('[+] %s', msg);
      }
   },
}

App.init();
