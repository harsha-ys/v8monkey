# ***** BEGIN LICENSE BLOCK *****
# Version: MPL 1.1/GPL 2.0/LGPL 2.1
#
# The contents of this file are subject to the Mozilla Public License Version
# 1.1 (the "License"); you may not use this file except in compliance with
# the License. You may obtain a copy of the License at
# http://www.mozilla.org/MPL/
#
# Software distributed under the License is distributed on an "AS IS" basis,
# WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
# for the specific language governing rights and limitations under the
# License.
#
# The Original Code is the Tab View
#
# The Initial Developer of the Original Code is Mozilla Foundation.
# Portions created by the Initial Developer are Copyright (C) 2010
# the Initial Developer. All Rights Reserved.
#
# Contributor(s):
#   Raymond Lee <raymond@appcoast.com>
#
# Alternatively, the contents of this file may be used under the terms of
# either the GNU General Public License Version 2 or later (the "GPL"), or
# the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
# in which case the provisions of the GPL or the LGPL are applicable instead
# of those above. If you wish to allow use of your version of this file only
# under the terms of either the GPL or the LGPL, and not to allow others to
# use your version of this file under the terms of the MPL, indicate your
# decision by deleting the provisions above and replace them with the notice
# and other provisions required by the GPL or the LGPL. If you do not delete
# the provisions above, a recipient may use your version of this file under
# the terms of any one of the MPL, the GPL or the LGPL.
#
# ***** END LICENSE BLOCK *****

let TabView = {
  _window: null,
  _sessionstore: null,
  _visibilityID: "tabview-visibility",
  
  // ----------
  init: function TabView_init() {    
    // ___ keys    
    this._setBrowserKeyHandlers();

    // ___ visibility
    this._sessionstore =
      Components.classes["@mozilla.org/browser/sessionstore;1"]
        .getService(Components.interfaces.nsISessionStore);

    let data = this._sessionstore.getWindowValue(window, this._visibilityID);
    if (data) {
      data = JSON.parse(data);
      if (data && data.visible)
        this.toggle();
    }
  },

  // ----------
  _initFrame: function TabView__initFrame() {
    if (this._window)
      return;
      
    // ___ create the frame
    var iframe = document.createElement("iframe");
    iframe.id = "tab-view";
    iframe.setAttribute("transparent", "true");
    iframe.flex = 1;
    iframe.setAttribute("src", "chrome://browser/content/tabview.html");
    document.getElementById("tab-view-deck").appendChild(iframe);
    this._window = iframe.contentWindow;
    
    // ___ visibility storage handler
    let self = this;
    var observer = {
      observe : function(subject, topic, data) {
        if (topic == "quit-application-requested") {
          let data = {
            visible: self.isVisible()
          };
          
          self._sessionstore.setWindowValue(window, self._visibilityID, JSON.stringify(data));
        }
      }
    };
    
    Services.obs.addObserver(observer, "quit-application-requested", false);
  },

  // ----------
  isVisible: function() {
    return (document.getElementById("tab-view-deck").selectedIndex == 1);
  },

  // ----------
  toggle: function() {
    let firstTime = false;
    let event = document.createEvent("Events");

    if (this.isVisible()) {
      event.initEvent("tabviewhide", false, false);
    } else {
      if (!this._window) {
        firstTime = true;
        this._initFrame(); 
      }        
        
      event.initEvent("tabviewshow", false, false);
    }
    
    if (firstTime) {
      // TODO: need a better way to know when the frame is loaded
      // I suppose we can just attach to its onload?
      setTimeout(function() {
        dispatchEvent(event);
      }, 100);
    } else {
      dispatchEvent(event);
    }
  },

  // ----------
  getWindowTitle: function() {
    let brandBundle = document.getElementById("bundle_brand");
    let brandShortName = brandBundle.getString("brandShortName");
    return gNavigatorBundle.getFormattedString("tabView.title", [brandShortName]);
  },

  // ----------
  updateContextMenu: function(tab, popup) {
    let isEmpty = true;

    while(popup.lastChild && popup.lastChild.id != "context_namedGroups")
      popup.removeChild(popup.lastChild);

	  if (!this._window)
	    this._initFrame(); // TODO: wait for load	    

    let activeGroup = tab.tabItem.parent;
    let groupItems = this._window.GroupItems.groupItems;
    let self = this;

    groupItems.forEach(function(groupItem) { 
      if (groupItem.getTitle().length > 0 && 
          (!activeGroup || activeGroup.id != groupItem.id)) {
        let menuItem = self._createGroupMenuItem(groupItem);
        popup.appendChild(menuItem);
        isEmpty = false;
      }
    });
    document.getElementById("context_namedGroups").hidden = isEmpty;
  },

  // ----------
  _createGroupMenuItem : function(groupItem) {
    let menuItem = document.createElement("menuitem")
    menuItem.setAttribute("class", "group");
    menuItem.setAttribute("label", groupItem.getTitle());
    menuItem.setAttribute(
      "oncommand", 
      "TabView.moveTabTo(TabContextMenu.contextTab,'" + groupItem.id + "')");

    return menuItem;
  },

  // ----------
  moveTabTo: function(tab, groupItemId) {
    if (this._window)
      this._window.GroupItems.moveTabToGroupItem(tab, groupItemId);
  },

  // ----------
  // Overrides the browser's keys for navigating between tab (outside of the
  // TabView UI) so they do the right thing in respect to groupItems.
  _setBrowserKeyHandlers : function() {
    var self = this;

    window.addEventListener("keypress", function(event) {
      if (self.isVisible())
        return;

      var charCode = event.charCode;
#ifdef XP_MACOSX
      // if a text box in a webpage has the focus, the event.altKey would
      // return false so we are depending on the charCode here.
      if (!event.ctrlKey && !event.metaKey && !event.shiftKey &&
          charCode == 160) { // alt + space
#else
      if (event.ctrlKey && !event.metaKey && !event.shiftKey &&
          !event.altKey && charCode == 32) { // ctrl + space
#endif
        event.stopPropagation();
        event.preventDefault();
        self.toggle();
        return;
      }

      // Control (+ Shift) + `
      if (event.ctrlKey && !event.metaKey && !event.altKey &&
          (charCode == 96 || charCode == 126)) {
        event.stopPropagation();
        event.preventDefault();

        if (!self._window)
          self._initFrame(); // TODO: wait for load

        var tabItem = self._window.GroupItems.getNextGroupItemTab(event.shiftKey);
        if (tabItem)
          window.gBrowser.selectedTab = tabItem.tab;
      }
    }, true);
  }
};
