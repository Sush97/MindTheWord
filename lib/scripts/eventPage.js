import { ContextMenu } from './services/contextMenu';
import { localData } from './utils/defaultStorage';

var contextMenu = new ContextMenu(),
  translatedWords = {},
  activeContextMenuIds = ['speakTheWord', 'blacklistWebsite', 'searchForSimilarWords', 'translateSentence', 'whitelistWebsite'];

/**
 * Set up default data and store it in `chrome.storage.localData`
 */
function initializeLocalStorage() {
  chrome.storage.local.set(localData);
}

/**
 * Setup local data storage and context menus
 */
function setup() {
  initializeLocalStorage();
  chrome.contextMenus.create({
    'title': 'MindTheWord',
    'id': 'parent',
    'contexts': ['selection', 'page']
  });
  chrome.contextMenus.create({
    'title': 'Speak The Word',
    'parentId': 'parent',
    'contexts': ['selection'],
    'id': 'speakTheWord'
  });
  chrome.contextMenus.create({
    'title': 'Blacklist Website',
    'parentId': 'parent',
    'contexts': ['page', 'selection'],
    'id': 'blacklistWebsite'
  });
  chrome.contextMenus.create({
    'title': 'Whitelist Website',
    'parentId': 'parent',
    'contexts': ['page', 'selection'],
    'id': 'whitelistWebsite'
  });
  chrome.contextMenus.create({
    'title': 'Search For Similar Words',
    'parentId': 'parent',
    'contexts': ['selection'],
    'id': 'searchForSimilarWords'
  });
  chrome.contextMenus.create({
    'title': 'Google Search',
    'parentId': 'searchForSimilarWords',
    'contexts': ['selection'],
    'id': 'searchForSimilarWordsOnGoogle'
  });
  chrome.contextMenus.create({
    'title': 'Bing Search',
    'parentId': 'searchForSimilarWords',
    'contexts': ['selection'],
    'id': 'searchForSimilarWordsOnBing'
  });
  chrome.contextMenus.create({
    'title': 'Google Image Search',
    'parentId': 'searchForSimilarWords',
    'contexts': ['selection'],
    'id': 'searchForSimilarWordsOnGoogleImages'
  });
  chrome.contextMenus.create({
    'title': 'Thesaurus.com',
    'parentId': 'searchForSimilarWords',
    'contexts': ['selection'],
    'id': 'searchForSimilarWordsOnThesaurus'
  });
  chrome.contextMenus.create({
    'title': 'Translate Sentence',
    'parentId': 'parent',
    'contexts': ['selection'],
    'id': 'translateSentence'
  });
}

/**
 * Enable or disable all context menus
 * @param {boolean} value - true or false
 */
function setContextMenus(value) {
  for (let id in activeContextMenuIds) {
    chrome.contextMenus.update(activeContextMenuIds[id], {
      enabled: value
    });
  }
}

/**
 * Enable or disable whitelist website context menu
 * @param {boolean} value - true or false
 */
function setWhitelist(value) {
  chrome.contextMenus.update('whitelistWebsite', {
    enabled: value
  });
}

/**
 * Update context menu according to page
 * @param {string} url - active tab URL
 */
function updateContextMenu(url) {
  chrome.storage.local.get(['activation', 'blacklist'], (result) => {
    var blacklistWebsiteReg = new RegExp(result.blacklist),
      activation = result.activation;
    if (activation === false) {
      setContextMenus(false);
    } else if (blacklistWebsiteReg.test(url)) {
      setContextMenus(false);
      setWhitelist(true);
    } else if (/^\s*$/.test(url) === true) {
      setContextMenus(false);
    } else {
      setContextMenus(true);
      setWhitelist(false);
    }
  });
}

/**
 * Checks if URL is changed. Call `updateContextMenu` if
 * new URL is not blank or chrome URL.
 * @param {Integer} tabId - tab identifier
 * @param {Object} changeInfo - change information
 * @param {Object} tab - tab information
 */
function checkURLChange(tabId, changeInfo, tab) {
  if (changeInfo.url || changeInfo.status === 'complete') {
    if (/chrome.*\:\/\//.test(changeInfo.url) === false) {
      updateContextMenu(changeInfo.url);
    } else {
      setContextMenus(false);
    }
  }
}

/**
 * Checks the current active tab has a valid URL and
 * calls `updateContextMenu` if true.
 * @param {Object} activeInfo - information about active tab
 */
function checkActiveTabChange(activeInfo) {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (/chrome.*\:\/\//.test(tab.url) === false) {
      updateContextMenu(tab.url);
    } else {
      setContextMenus(false);
    }
  });
}

/**
 * Click event handler for context menu. Calls appropriate
 * functions from ContextMenu class.
 * @param {Object} info -
 * @param {Object} tabs -
 */
function contextMenuClickHandler(info, tab) {
  chrome.tabs.query({
    currentWindow: true,
    active: true
  }, (tabs) => {
    var tabURL = tabs[0].url;
    switch (info.menuItemId) {
      case 'blacklistWebsite':
        contextMenu.addUrlToBlacklist(tabURL);
        setContextMenus(false);
        setWhitelist(true);
        break;
      case 'searchForSimilarWordsOnThesaurus':
        contextMenu.searchForSimilarWords(info.selectionText, 'thesaurus');
        break;
      case 'searchForSimilarWordsOnGoogle':
        contextMenu.searchForSimilarWords(info.selectionText, 'google');
        break;
      case 'searchForSimilarWordsOnBing':
        contextMenu.searchForSimilarWords(info.selectionText, 'bing');
        break;
      case 'searchForSimilarWordsOnGoogleImages':
        contextMenu.searchForSimilarWords(info.selectionText, 'googleImages');
        break;
      case 'speakTheWord':
        chrome.storage.local.set({ 'utterance': info.selectionText }, function() {
          contextMenu.speakTheWord();
        });
        break;
      case 'translateSentence':
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'getTranslatedWords',
            action: 'storeSelection'
          }, (response) => {
            if (response) {
              contextMenu.translateSentence(info.selectionText, response.translatedWords)
                .then((translationData) => {
                  chrome.tabs.sendMessage(tabs[0].id, {
                    type: 'showTranslatedSentence',
                    data: translationData
                  });
                })
                .catch((e) => {
                  console.error('Error in obtaining translations', e);
                });
            }
          });
        });
        break;
      case 'whitelistWebsite':
        contextMenu.whitelistURL(tabURL);
        setContextMenus(true);
        setWhitelist(false);
        break;
      default:
        console.error('Wrong context menu id');
    }
  });
}

//On first installation, load default Data and initialize context menu
chrome.runtime.onInstalled.addListener(setup);

// context menu handlers
chrome.contextMenus.onClicked.addListener(contextMenuClickHandler);

// update context menu if URL is changed
chrome.tabs.onUpdated.addListener(checkURLChange);

// update context menu if active tab is changed
chrome.tabs.onActivated.addListener(checkActiveTabChange);

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message === 'message_on') {
    chrome.storage.local.get(null, function(obj) {
      chrome.browserAction.setBadgeText({ text: String(obj.numberOfTranslatedWords) });
      chrome.browserAction.setBadgeBackgroundColor({ color: [48, 63, 159, 1.0] });
    });
  }
  if (message === 'message_off') {
    chrome.browserAction.setBadgeText({ text: String('') });
  }
  if (message === 'speakTheWord') {
    contextMenu.speakTheWord();
  }
});