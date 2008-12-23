/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Bookmarks Sync.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2007
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *  Dan Mills <thunder@mozilla.com>
 *  Jono DiCarlo <jdicarlo@mozilla.org>
 *  Anant Narayanan <anant@kix.in>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

const EXPORTED_SYMBOLS = ['BookmarksEngine', 'BookmarksSharingManager'];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

// Annotation to use for shared bookmark folders, incoming and outgoing:
const INCOMING_SHARED_ANNO = "weave/shared-incoming";
const OUTGOING_SHARED_ANNO = "weave/shared-outgoing";
const SERVER_PATH_ANNO = "weave/shared-server-path";
// Standard names for shared files on the server
const KEYRING_FILE_NAME = "keyring";
const SHARED_BOOKMARK_FILE_NAME = "shared_bookmarks";
// Information for the folder that contains all incoming shares
const INCOMING_SHARE_ROOT_ANNO = "weave/mounted-shares-folder";
const INCOMING_SHARE_ROOT_NAME = "Shared Folders";

const SERVICE_NOT_SUPPORTED = "Service not supported on this platform";

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://weave/log4moz.js");
Cu.import("resource://weave/util.js");
Cu.import("resource://weave/crypto.js");
Cu.import("resource://weave/async.js");
Cu.import("resource://weave/engines.js");
Cu.import("resource://weave/stores.js");
Cu.import("resource://weave/trackers.js");
Cu.import("resource://weave/identity.js");
Cu.import("resource://weave/notifications.js");
Cu.import("resource://weave/resource.js");

Function.prototype.async = Async.sugar;

function BookmarksEngine() {
  this._init();
}
BookmarksEngine.prototype = {
  __proto__: SyncEngine.prototype,
  get _super() SyncEngine.prototype,

  get name() "bookmarks",
  get displayName() "Bookmarks",
  get logName() "Bookmarks",
  get serverPrefix() "user-data/bookmarks/",

  get _store() {
    let store = new BookmarksStore();
    this.__defineGetter__("_store", function() store);
    return store;
  },

  get _tracker() {
    let tracker = new BookmarksTracker();
    this.__defineGetter__("_tracker", function() tracker);
    return tracker;
  }
  // XXX for sharing, will need to re-add code to get new shares before syncing,
  //     and updating incoming/outgoing shared folders after syncing
};

function BookmarksStore() {
  this._init();
}
BookmarksStore.prototype = {
  __proto__: Store.prototype,
  _logName: "BStore",
  _lookup: null,

  __bms: null,
  get _bms() {
    if (!this.__bms)
      this.__bms = Cc["@mozilla.org/browser/nav-bookmarks-service;1"].
                   getService(Ci.nsINavBookmarksService);
    return this.__bms;
  },

  __hsvc: null,
  get _hsvc() {
    if (!this.__hsvc)
      this.__hsvc = Cc["@mozilla.org/browser/nav-history-service;1"].
                    getService(Ci.nsINavHistoryService);
    return this.__hsvc;
  },

  __ls: null,
  get _ls() {
    if (!this.__ls)
      this.__ls = Cc["@mozilla.org/browser/livemark-service;2"].
        getService(Ci.nsILivemarkService);
    return this.__ls;
  },

  __ms: null,
  get _ms() {
    if (!this.__ms)
      try {
        this.__ms = Cc["@mozilla.org/microsummary/service;1"].
          getService(Ci.nsIMicrosummaryService);
      } catch( e ) {
	this.__ms = SERVICE_NOT_SUPPORTED;
	this._log.warn("There is no Microsummary service.");
      }
    return this.__ms;
  },

  __ts: null,
  get _ts() {
    if (!this.__ts)
      this.__ts = Cc["@mozilla.org/browser/tagging-service;1"].
                  getService(Ci.nsITaggingService);
    return this.__ts;
  },

  __ans: null,
  get _ans() {
    if (!this.__ans)
      this.__ans = Cc["@mozilla.org/browser/annotation-service;1"].
                   getService(Ci.nsIAnnotationService);
    return this.__ans;
  },

  _getItemIdForGUID: function BStore__getItemIdForGUID(GUID) {
    switch (GUID) {
    case "menu":
      return this._bms.bookmarksMenuFolder;
    case "toolbar":
      return this._bms.toolbarFolder;
    case "unfiled":
      return this._bms.unfiledBookmarksFolder;
    default:
      return this._bms.getItemIdForGUID(GUID);
    }
    return null;
  },

  _itemExists: function BStore__itemExists(id) {
    return this._getItemIdForGUID(id) >= 0;
  },

  create: function BStore_create(record) {
    let newId;
    let parentId = this._getItemIdForGUID(record.parentid);

    if (parentId < 0) {
      this._log.warn("Creating node with unknown parent -> reparenting to root");
      parentId = this._bms.bookmarksMenuFolder;
    }

    switch (record.cleartext.type) {
    case "query":
    case "bookmark":
    case "microsummary": {
      this._log.debug(" -> creating bookmark \"" + record.cleartext.title + "\"");
      let URI = Utils.makeURI(record.cleartext.URI);
      newId = this._bms.insertBookmark(parentId, URI, record.sortindex,
                                       record.cleartext.title);
      this._ts.untagURI(URI, null);
      this._ts.tagURI(URI, record.cleartext.tags);
      this._bms.setKeywordForBookmark(newId, record.cleartext.keyword);
      if (record.cleartext.description) {
        this._ans.setItemAnnotation(newId, "bookmarkProperties/description",
                                    record.cleartext.description, 0,
                                   this._ans.EXPIRE_NEVER);
      }

      if (record.cleartext.type == "microsummary") {
        this._log.debug("   \-> is a microsummary");
        this._ans.setItemAnnotation(newId, "bookmarks/staticTitle",
                                    record.cleartext.staticTitle || "", 0, this._ans.EXPIRE_NEVER);
        let genURI = Utils.makeURI(record.cleartext.generatorURI);
	if (this._ms == SERVICE_NOT_SUPPORTED) {
	  this._log.warn("Can't create microsummary -- not supported.");
	} else {
          try {
            let micsum = this._ms.createMicrosummary(URI, genURI);
            this._ms.setMicrosummary(newId, micsum);
          }
          catch(ex) { /* ignore "missing local generator" exceptions */ }
	}
      }
    } break;
    case "folder":
      this._log.debug(" -> creating folder \"" + record.cleartext.title + "\"");
      newId = this._bms.createFolder(parentId,
                                     record.cleartext.title,
                                     record.sortindex);
      // If folder is an outgoing share, put the annotations on it:
      if ( record.cleartext.outgoingSharedAnno != undefined ) {
	this._ans.setItemAnnotation(newId,
				    OUTGOING_SHARED_ANNO,
                                    record.cleartext.outgoingSharedAnno,
				    0,
				    this._ans.EXPIRE_NEVER);
	this._ans.setItemAnnotation(newId,
				    SERVER_PATH_ANNO,
                                    record.cleartext.serverPathAnno,
				    0,
				    this._ans.EXPIRE_NEVER);

      }
      break;
    case "livemark":
      this._log.debug(" -> creating livemark \"" + record.cleartext.title + "\"");
      newId = this._ls.createLivemark(parentId,
                                      record.cleartext.title,
                                      Utils.makeURI(record.cleartext.siteURI),
                                      Utils.makeURI(record.cleartext.feedURI),
                                      record.sortindex);
      break;
    case "incoming-share":
      /* even though incoming shares are folders according to the
       * bookmarkService, _wrap() wraps them as type=incoming-share, so we
       * handle them separately, like so: */
      this._log.debug(" -> creating incoming-share \"" + record.cleartext.title + "\"");
      newId = this._bms.createFolder(parentId,
                                     record.cleartext.title,
                                     record.sortindex);
      this._ans.setItemAnnotation(newId,
				  INCOMING_SHARED_ANNO,
                                  record.cleartext.incomingSharedAnno,
				  0,
				  this._ans.EXPIRE_NEVER);
      this._ans.setItemAnnotation(newId,
				  SERVER_PATH_ANNO,
                                  record.cleartext.serverPathAnno,
				  0,
				  this._ans.EXPIRE_NEVER);
      break;
    case "separator":
      this._log.debug(" -> creating separator");
      newId = this._bms.insertSeparator(parentId, record.sortindex);
      break;
    default:
      this._log.error("_create: Unknown item type: " + record.cleartext.type);
      break;
    }
    if (newId) {
      this._log.trace("Setting GUID of new item " + newId + " to " + record.id);
      let cur = this._bms.getItemGUID(newId);
      if (cur == record.id)
        this._log.warn("Item " + newId + " already has GUID " + record.id);
      else {
        this._bms.setItemGUID(newId, record.id);
        Engines.get("bookmarks")._tracker._all[newId] = record.id; // HACK - see tracker
      }
    }
  },

  remove: function BStore_remove(record) {
    if (record.id == "menu" ||
        record.id == "toolbar" ||
        record.id == "unfiled") {
      this._log.warn("Attempted to remove root node (" + record.id +
                     ").  Skipping record removal.");
      return;
    }

    var itemId = this._bms.getItemIdForGUID(record.id);
    if (itemId < 0) {
      this._log.debug("Item " + record.id + " already removed");
      return;
    }
    var type = this._bms.getItemType(itemId);

    switch (type) {
    case this._bms.TYPE_BOOKMARK:
      this._log.debug("  -> removing bookmark " + record.id);
      this._bms.removeItem(itemId);
      break;
    case this._bms.TYPE_FOLDER:
      this._log.debug("  -> removing folder " + record.id);
      this._bms.removeFolder(itemId);
      break;
    case this._bms.TYPE_SEPARATOR:
      this._log.debug("  -> removing separator " + record.id);
      this._bms.removeItem(itemId);
      break;
    default:
      this._log.error("remove: Unknown item type: " + type);
      break;
    }
  },

  update: function BStore_update(record) {
    let itemId = this._getItemIdForGUID(record.id);

    if (record.id == "menu" ||
        record.id == "toolbar" ||
        record.id == "unfiled") {
      this._log.debug("Skipping update for root node.");
      return;
    }
    if (itemId < 0) {
      this._log.debug("Skipping update for unknown item: " + record.id);
      return;
    }

    this._log.trace("Updating " + record.id + " (" + itemId + ")");

    if ((this._bms.getItemIndex(itemId) != record.sortindex) ||
        (this._bms.getFolderIdForItem(itemId) !=
         this._getItemIdForGUID(record.parentid))) {
      this._log.trace("Moving item (changing folder/index)");
      let parentid = this._getItemIdForGUID(record.parentid);
      this._bms.moveItem(itemId, parentid, record.sortindex);
    }

    for (let key in record.cleartext) {
      switch (key) {
      case "title":
        this._bms.setItemTitle(itemId, record.cleartext.title);
        break;
      case "URI":
        this._bms.changeBookmarkURI(itemId, Utils.makeURI(record.cleartext.URI));
        break;
      case "tags": {
        // filter out null/undefined/empty tags
        let tags = record.cleartext.tags.filter(function(t) t);
        let tagsURI = this._bms.getBookmarkURI(itemId);
        this._ts.untagURI(tagsURI, null);
        this._ts.tagURI(tagsURI, tags);
      } break;
      case "keyword":
        this._bms.setKeywordForBookmark(itemId, record.cleartext.keyword);
        break;
      case "description":
        this._ans.setItemAnnotation(itemId, "bookmarkProperties/description",
                                    record.cleartext.description, 0,
                                    this._ans.EXPIRE_NEVER);
        break;
      case "generatorURI": {
        let micsumURI = Utils.makeURI(this._bms.getBookmarkURI(itemId));
        let genURI = Utils.makeURI(record.cleartext.generatorURI);
	if (this._ms == SERVICE_NOT_SUPPORTED) {
	  this._log.warn("Can't create microsummary -- not supported.");
	} else {
          let micsum = this._ms.createMicrosummary(micsumURI, genURI);
          this._ms.setMicrosummary(itemId, micsum);
	}
      } break;
      case "siteURI":
        this._ls.setSiteURI(itemId, Utils.makeURI(record.cleartext.siteURI));
        break;
      case "feedURI":
        this._ls.setFeedURI(itemId, Utils.makeURI(record.cleartext.feedURI));
        break;
      case "outgoingSharedAnno":
	this._ans.setItemAnnotation(itemId, OUTGOING_SHARED_ANNO,
				    record.cleartext.outgoingSharedAnno, 0,
				    this._ans.EXPIRE_NEVER);
	break;
      case "incomingSharedAnno":
	this._ans.setItemAnnotation(itemId, INCOMING_SHARED_ANNO,
				    record.cleartext.incomingSharedAnno, 0,
				    this._ans.EXPIRE_NEVER);
	break;
      case "serverPathAnno":
	this._ans.setItemAnnotation(itemId, SERVER_PATH_ANNO,
				    record.cleartext.serverPathAnno, 0,
				    this._ans.EXPIRE_NEVER);
	break;
      }
    }
  },

  changeItemID: function BStore_changeItemID(oldID, newID) {
    var itemId = this._getItemIdForGUID(oldID);
    if (itemId == null) // toplevel folder
      return;
    if (itemId < 0) {
      this._log.warn("Can't change GUID " + oldID + " to " +
                      newID + ": Item does not exist");
      return;
    }

    var collision = this._getItemIdForGUID(newID);
    if (collision >= 0) {
      this._log.warn("Can't change GUID " + oldID + " to " +
                      newID + ": new ID already in use");
      return;
    }

    this._log.debug("Changing GUID " + oldID + " to " + newID);
    this._bms.setItemGUID(itemId, newID);
    Engines.get("bookmarks")._tracker._all[itemId] = newID; // HACK - see tracker
  },

  _getNode: function BSS__getNode(folder) {
    let query = this._hsvc.getNewQuery();
    query.setFolders([folder], 1);
    return this._hsvc.executeQuery(query, this._hsvc.getNewQueryOptions()).root;
  },

  __wrap: function BSS___wrap(node, items, parentid, index, depth, guidOverride) {
    let GUID, item;

    // we override the guid for the root items, "menu", "toolbar", etc.
    if (guidOverride) {
      GUID = guidOverride;
      item = {sortindex: index, depth: depth};
    } else {
      GUID = this._bms.getItemGUID(node.itemId);
      item = {parentid: parentid, sortindex: index, depth: depth};
    }

    if (node.type == node.RESULT_TYPE_FOLDER) {
      if (this._ls.isLivemark(node.itemId)) {
        item.type = "livemark";
        let siteURI = this._ls.getSiteURI(node.itemId);
        let feedURI = this._ls.getFeedURI(node.itemId);
        item.siteURI = siteURI? siteURI.spec : "";
        item.feedURI = feedURI? feedURI.spec : "";
      } else if (this._ans.itemHasAnnotation(node.itemId, INCOMING_SHARED_ANNO)){
	/* When there's an incoming share, we just sync the folder itself
	 and the values of its annotations: NOT any of its contents.  So
	 we'll wrap it as type=incoming-share, not as a "folder". */
	item.type = "incoming-share";
	item.title = node.title;
        item.serverPathAnno = this._ans.getItemAnnotation(node.itemId,
                                                      SERVER_PATH_ANNO);
	item.incomingSharedAnno = this._ans.getItemAnnotation(node.itemId,
                                                      INCOMING_SHARED_ANNO);
      } else {
        item.type = "folder";
        node.QueryInterface(Ci.nsINavHistoryQueryResultNode);
        node.containerOpen = true;
	// If folder is an outgoing share, wrap its annotations:
	if (this._ans.itemHasAnnotation(node.itemId, OUTGOING_SHARED_ANNO)) {
	  item.outgoingSharedAnno = this._ans.getItemAnnotation(node.itemId,
                                                      OUTGOING_SHARED_ANNO);
	}
	if (this._ans.itemHasAnnotation(node.itemId, SERVER_PATH_ANNO)) {
	  item.serverPathAnno = this._ans.getItemAnnotation(node.itemId,
							    SERVER_PATH_ANNO);
	}

        for (var i = 0; i < node.childCount; i++) {
          this.__wrap(node.getChild(i), items, GUID, i, depth + 1);
        }
      }
      if (!guidOverride)
        item.title = node.title; // no titles for root nodes

    } else if (node.type == node.RESULT_TYPE_URI ||
               node.type == node.RESULT_TYPE_QUERY) {
      if (this._ms != SERVICE_NOT_SUPPORTED &&
	  this._ms.hasMicrosummary(node.itemId)) {
        item.type = "microsummary";
        let micsum = this._ms.getMicrosummary(node.itemId);
        item.generatorURI = micsum.generator.uri.spec; // breaks local generators
        item.staticTitle = "";
        try {
          item.staticTitle = this._ans.getItemAnnotation(node.itemId,
                                                         "bookmarks/staticTitle");
        } catch (e) {}
      } else if (node.type == node.RESULT_TYPE_QUERY) {
        item.type = "query";
        item.title = node.title;
      } else {
        item.type = "bookmark";
        item.title = node.title;
      }

      try {
        item.description =
          this._ans.getItemAnnotation(node.itemId, "bookmarkProperties/description");
      } catch (e) {
        item.description = undefined;
      }

      item.URI = node.uri;

      // This will throw if makeURI can't make an nsIURI object out of the
      // node.uri string (or return null if node.uri is null), in which case
      // we won't be able to get tags for the bookmark (but we'll still sync
      // the rest of the record).
      let uri;
      try {
        uri = Utils.makeURI(node.uri);
      }
      catch(e) {
        this._log.error("error parsing URI string <" + node.uri + "> " +
                        "for item " + node.itemId + " (" + node.title + "): " +
                        e);
      }

      if (uri)
        item.tags = this._ts.getTagsForURI(uri, {});

      item.keyword = this._bms.getKeywordForBookmark(node.itemId);

    } else if (node.type == node.RESULT_TYPE_SEPARATOR) {
      item.type = "separator";

    } else {
      this._log.warn("Warning: unknown item type, cannot serialize: " + node.type);
      return;
    }

    items[GUID] = item;
  },

  // helper
  _wrap: function BStore__wrap(node, items, rootName) {
    return this.__wrap(node, items, null, 0, 0, rootName);
  },

  wrap: function BStore_wrap() {
    var items = {};
    this._wrap(this._getNode(this._bms.bookmarksMenuFolder), items, "menu");
    this._wrap(this._getNode(this._bms.toolbarFolder), items, "toolbar");
    this._wrap(this._getNode(this._bms.unfiledBookmarksFolder), items, "unfiled");
    this._lookup = items;
    return items;
  },

  // FIXME: the fast path here is not so bad, specially since the engine always
  //        gives the cache hint atm.  but wrapping all items to return just one
  //        (the slow path) is pretty bad
  wrapItem: function BStore_wrapItem(id) {
    if (this._itemCache)
      return this._itemCache[id];
    let all = this.wrap();
    return all[id];
  },

  // XXX need a better way to query Places for all GUIDs
  getAllIDs: function BStore_getAllIDs() {
    let all = this.wrap();
    delete all["unfiled"];
    delete all["toolbar"];
    delete all["menu"];
    return all;
  },

  wipe: function BStore_wipe() {
    this._bms.removeFolderChildren(this._bms.bookmarksMenuFolder);
    this._bms.removeFolderChildren(this._bms.toolbarFolder);
    this._bms.removeFolderChildren(this._bms.unfiledBookmarksFolder);
  },

  __resetGUIDs: function BStore___resetGUIDs(node) {
    let self = yield;

    if (this._ans.itemHasAnnotation(node.itemId, "placesInternal/GUID"))
      this._ans.removeItemAnnotation(node.itemId, "placesInternal/GUID");

    if (node.type == node.RESULT_TYPE_FOLDER &&
        !this._ls.isLivemark(node.itemId)) {
      yield Utils.makeTimerForCall(self.cb); // Yield to main loop
      node.QueryInterface(Ci.nsINavHistoryQueryResultNode);
      node.containerOpen = true;
      for (var i = 0; i < node.childCount; i++) {
        this.__resetGUIDs(node.getChild(i));
      }
    }
  },

  _resetGUIDs: function BStore__resetGUIDs() {
    let self = yield;
    this.__resetGUIDs(this._getNode(this._bms.bookmarksMenuFolder));
    this.__resetGUIDs(this._getNode(this._bms.toolbarFolder));
    this.__resetGUIDs(this._getNode(this._bms.unfiledBookmarksFolder));
  }
};

function BookmarksTracker() {
  this._init();
}
BookmarksTracker.prototype = {
  __proto__: Tracker.prototype,
  _logName: "BmkTracker",
  file: "bookmarks",

  get _bms() {
    let bms = Cc["@mozilla.org/browser/nav-bookmarks-service;1"].
      getService(Ci.nsINavBookmarksService);
    this.__defineGetter__("_bms", function() bms);
    return bms;
  },

  QueryInterface: XPCOMUtils.generateQI([Ci.nsINavBookmarkObserver]),

  _init: function BMT__init() {
    this.__proto__.__proto__._init.call(this);

    // NOTE: since the callbacks give us item IDs (not GUIDs), we use
    // getItemGUID to get it within the callback.  For removals, however,
    // that doesn't work because the item is already gone! (and worse, Places
    // has a bug where it will generate a new one instead of throwing).
    // Our solution: cache item IDs -> GUIDs

    // FIXME: very roundabout way of getting id -> guid mapping!
    let store = new BookmarksStore();
    let all = store.wrap();
    this._all = {};
    for (let guid in all) {
      this._all[this._bms.getItemIdForGUID(guid)] = guid;
    }

    this._bms.addObserver(this, false);
  },

  /* Every add/remove/change is worth 10 points */
  _upScore: function BMT__upScore() {
    if (!this.enabled)
      return;
    this._score += 10;
  },

  onItemAdded: function BMT_onEndUpdateBatch(itemId, folder, index) {
    this._all[itemId] = this._bms.getItemGUID(itemId);
    //if (!this.enabled)
      //return;
    this._log.trace("onItemAdded: " + itemId);
    this.addChangedID(this._all[itemId]);
    this._upScore();
  },

  onItemRemoved: function BMT_onItemRemoved(itemId, folder, index) {
    delete this._all[itemId];
    if (!this.enabled)
      return;
    this._log.trace("onItemRemoved: " + itemId);
    this.addChangedID(this._all[itemId]);
    this._upScore();
  },

  onItemChanged: function BMT_onItemChanged(itemId, property, isAnnotationProperty, value) {
    if (!this.enabled)
      return;
    this._log.trace("onItemChanged: " + itemId + ", property: " + property +
                    ", isAnno: " + isAnnotationProperty + ", value: " + value);

    // NOTE: we get onItemChanged too much, when adding an item, changing its
    //       GUID, before removal... it makes removals break, because trying
    //       to update our cache before removals makes it so we think the
    //       temporary guid was removed, instead of the real one.
    //       Therefore, we ignore all guid changes.  When *Weave* changes the
    //       GUID, we take care to update the tracker's cache.  If anyone else
    //       changes the GUID, that will case breakage.
    let guid = this._bms.getItemGUID(itemId);
    if (guid != this._all[itemId])
      this._log.trace("GUID change, ignoring");
    else
      this.addChangedID(this._all[itemId]); // some other change

    this._upScore();
  },

  onItemMoved: function BMT_onItemMoved(itemId, oldParent, oldIndex, newParent, newIndex) {
    if (!this.enabled)
      return;
    this._log.trace("onItemMoved: " + itemId);
    this.addChangedID(this._all[itemId]);
    this._upScore();
  },

  onBeginUpdateBatch: function BMT_onBeginUpdateBatch() {},
  onEndUpdateBatch: function BMT_onEndUpdateBatch() {},
  onItemVisited: function BMT_onItemVisited(itemId, aVisitID, time) {}
};
