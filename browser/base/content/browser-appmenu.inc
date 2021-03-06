# -*- Mode: HTML -*-
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
# The Original Code is Firefox Application Menu.
#
# The Initial Developer of the Original Code is
# The Mozilla Foundation.
# Portions created by the Initial Developer are Copyright (C) 2010
# the Initial Developer. All Rights Reserved.
#
# Contributor(s):
#   Dão Gottwald <dao@mozilla.com>
#   Joshua M. <soapyhamhocks@gmail.com>
#   Margaret Leibovic <margaret.leibovic@gmail.com>
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

<menupopup id="appmenu-popup"
           onpopupshowing="if (event.target == this) {
                             updateEditUIVisibility();
#ifdef MOZ_SERVICES_SYNC
                             gSyncUI.updateUI();
#endif
                             return;
                           }
                           if (event.target.parentNode.parentNode.parentNode.parentNode == this)
                             this._currentPopup = event.target;">
  <hbox>
    <vbox id="appmenuPrimaryPane">
      <splitmenu id="appmenu_newTab"
                 label="&tabCmd.label;"
                 command="cmd_newNavigatorTab">
          <menupopup>
            <menuitem id="appmenu_newTab_popup"
                      label="&tabCmd.label;"
                      command="cmd_newNavigatorTab"
                      key="key_newNavigatorTab"/>
            <menuitem id="appmenu_newNavigator"
                      label="&newNavigatorCmd.label;"
                      command="cmd_newNavigator"
                      key="key_newNavigator"/>
            <menuseparator/>
            <menuitem id="appmenu_openFile"
                      label="&openFileCmd.label;"
                      command="Browser:OpenFile"
                      key="openFileKb"/>
          </menupopup>
      </splitmenu>
      <menuitem id="appmenu_privateBrowsing"
                class="menuitem-iconic menuitem-iconic-tooltip"
                label="&privateBrowsingCmd.start.label;"
                startlabel="&privateBrowsingCmd.start.label;"
                stoplabel="&privateBrowsingCmd.stop.label;"
                command="Tools:PrivateBrowsing"
                key="key_privatebrowsing"/>
      <menuitem label="&goOfflineCmd.label;"
                id="appmenu_offlineModeRecovery"
                type="checkbox"
                observes="workOfflineMenuitemState"
                oncommand="BrowserOffline.toggleOfflineStatus();"/>
      <menuseparator class="appmenu-menuseparator"/>
      <hbox>
        <menuitem id="appmenu-edit-label"
                  label="&appMenuEdit.label;"
                  disabled="true"/>
        <toolbarbutton id="appmenu-cut"
                       class="appmenu-edit-button"
                       command="cmd_cut"
                       onclick="if (!this.disabled) hidePopup();"
                       tooltiptext="&cutButton.tooltip;"/>
        <toolbarbutton id="appmenu-copy"
                       class="appmenu-edit-button"
                       command="cmd_copy"
                       onclick="if (!this.disabled) hidePopup();"
                       tooltiptext="&copyButton.tooltip;"/>
        <toolbarbutton id="appmenu-paste"
                       class="appmenu-edit-button"
                       command="cmd_paste"
                       onclick="if (!this.disabled) hidePopup();"
                       tooltiptext="&pasteButton.tooltip;"/>
        <spacer flex="1"/>
        <menu id="appmenu-editmenu">
          <menupopup id="appmenu-editmenu-menupopup">
            <menuitem id="appmenu-editmenu-cut"
                      class="menuitem-iconic"
                      label="&cutCmd.label;"
                      key="key_cut"
                      command="cmd_cut"/>
            <menuitem id="appmenu-editmenu-copy"
                      class="menuitem-iconic"
                      label="&copyCmd.label;"
                      key="key_copy"
                      command="cmd_copy"/>
            <menuitem id="appmenu-editmenu-paste"
                      class="menuitem-iconic"
                      label="&pasteCmd.label;"
                      key="key_paste"
                      command="cmd_paste"/>
            <menuseparator/>
            <menuitem id="appmenu-editmenu-undo"
                      label="&undoCmd.label;"
                      key="key_undo"
                      command="cmd_undo"/>
            <menuitem id="appmenu-editmenu-redo"
                      label="&redoCmd.label;"
                      key="key_redo"
                      command="cmd_redo"/>
            <menuseparator/>
            <menuitem id="appmenu-editmenu-selectAll"
                      label="&selectAllCmd.label;"
                      key="key_selectAll"
                      command="cmd_selectAll"/>
            <menuseparator/>
            <menuitem id="appmenu-editmenu-delete"
                      label="&deleteCmd.label;"
                      key="key_delete"
                      command="cmd_delete"/>
          </menupopup>
        </menu>
      </hbox>
      <menuitem id="appmenu_find"
                class="menuitem-tooltip"
                label="&appMenuFind.label;"
                command="cmd_find"
                key="key_find"/>
      <menuseparator class="appmenu-menuseparator"/>
      <menuitem id="appmenu_savePage"
                class="menuitem-tooltip"
                label="&savePageCmd.label;"
                command="Browser:SavePage"
                key="key_savePage"/>
      <menuitem id="appmenu_sendLink"
                label="&sendPageCmd.label;"
                command="Browser:SendLink"/>
      <splitmenu id="appmenu_print"
                 iconic="true"
                 label="&printCmd.label;"
                 command="cmd_print">
          <menupopup>
            <menuitem id="appmenu_print_popup"
                      class="menuitem-iconic"
                      label="&printCmd.label;"
                      command="cmd_print"
                      key="printKb"/>
            <menuitem id="appmenu_printPreview"
                      label="&printPreviewCmd.label;"
                      command="cmd_printPreview"/>
            <menuitem id="appmenu_printSetup"
                      label="&printSetupCmd.label;"
                      command="cmd_pageSetup"/>
          </menupopup>
      </splitmenu>
      <menuseparator class="appmenu-menuseparator"/>
      <menu id="appmenu_webDeveloper"
            label="&appMenuWebDeveloper.label;">
        <menupopup id="appmenu_webDeveloper_popup"
                   onpopupshowing="onWebDeveloperMenuShowing();">
          <menuitem id="appmenu_webConsole"
                    label="&webConsoleCmd.label;"
                    type="checkbox"
                    command="Tools:WebConsole"
                    key="key_webConsole"/>
          <menuitem id="appmenu_pageInspect"
                    hidden="true"
                    label="&inspectMenu.label;"
                    type="checkbox"
                    command="Tools:Inspect"
                    key="key_inspect"/>
          <menuitem id="appmenu_debugger"
                    hidden="true"
                    label="&debuggerMenu.label;"
                    key="key_debugger"
                    command="Tools:Debugger"/>
          <menuitem id="appmenu_scratchpad"
                    hidden="true"
                    label="&scratchpad.label;"
                    key="key_scratchpad"
                    command="Tools:Scratchpad"/>
          <menuitem id="appmenu_styleeditor"
                    hidden="true"
                    label="&styleeditor.label;"
                    key="key_styleeditor"
                    command="Tools:StyleEditor"/>
          <menuitem id="appmenu_pageSource"
                    label="&viewPageSourceCmd.label;"
                    command="View:PageSource"
                    key="key_viewSource"/>
          <menuitem id="appmenu_errorConsole"
                    hidden="true"
                    label="&errorConsoleCmd.label;"
                    key="key_errorConsole"
                    oncommand="toJavaScriptConsole();"/>
          <menuseparator id="appmenu_devToolsEndSeparator"/>
          <menuitem id="appmenu_getMoreDevtools"
                    label="&getMoreDevtoolsCmd.label;"
                    oncommand="openUILinkIn('https://addons.mozilla.org/firefox/collections/mozilla/webdeveloper/', 'tab');"/>
          <menuseparator/>
#define ID_PREFIX appmenu_developer_
#define OMIT_ACCESSKEYS
#include browser-charsetmenu.inc
#undef ID_PREFIX
#undef OMIT_ACCESSKEYS
          <menuitem label="&goOfflineCmd.label;"
                    type="checkbox"
                    observes="workOfflineMenuitemState"
                    oncommand="BrowserOffline.toggleOfflineStatus();"/>
        </menupopup>
      </menu>
      <menuseparator class="appmenu-menuseparator"/>
#define ID_PREFIX appmenu_
#define OMIT_ACCESSKEYS
#include browser-charsetmenu.inc
#undef ID_PREFIX
#undef OMIT_ACCESSKEYS
      <menuitem id="appmenu_fullScreen"
                class="menuitem-tooltip"
                label="&fullScreenCmd.label;"
                type="checkbox"
                observes="View:FullScreen"
                key="key_fullScreen"/>
#ifdef MOZ_SERVICES_SYNC
      <!-- only one of sync-setup or sync-syncnow will be showing at once -->
      <menuitem id="sync-setup-appmenu"
                label="&syncSetup.label;"
                observes="sync-setup-state"
                oncommand="gSyncUI.openSetup()"/>
      <menuitem id="sync-syncnowitem-appmenu"
                label="&syncSyncNowItem.label;"
                observes="sync-syncnow-state"
                oncommand="gSyncUI.doSync(event);"/>
#endif
      <menuitem id="appmenu-quit"
                class="menuitem-iconic"
#ifdef XP_WIN
                label="&quitApplicationCmdWin.label;"
#else
                label="&quitApplicationCmd.label;"
#endif
                command="cmd_quitApplication"/>
    </vbox>
    <vbox id="appmenuSecondaryPane">
      <splitmenu id="appmenu_bookmarks"
                 iconic="true"
                 label="&bookmarksMenu.label;"
                 command="Browser:ShowAllBookmarks">
          <menupopup id="appmenu_bookmarksPopup"
                     placespopup="true"
                     context="placesContext"
                     openInTabs="children"
                     oncommand="BookmarksEventHandler.onCommand(event);"
                     onclick="BookmarksEventHandler.onClick(event);"
                     onpopupshowing="BookmarksMenuButton.onPopupShowing(event);
                                     if (!this.parentNode._placesView)
                                       new PlacesMenu(event, 'place:folder=BOOKMARKS_MENU');"
                     tooltip="bhTooltip"
                     popupsinherittooltip="true">
            <menuitem id="appmenu_showAllBookmarks"
                      label="&showAllBookmarks2.label;"
                      command="Browser:ShowAllBookmarks"
                      context=""
                      key="manBookmarkKb"/>
            <menuseparator/>
            <menuitem id="appmenu_bookmarkThisPage"
                      class="menuitem-iconic"
                      label="&bookmarkThisPageCmd.label;"
                      command="Browser:AddBookmarkAs"
                      key="addBookmarkAsKb"/>
            <menuitem id="appmenu_subscribeToPage"
                      class="menuitem-iconic"
                      label="&subscribeToPageMenuitem.label;"
                      oncommand="return FeedHandler.subscribeToFeed(null, event);"
                      onclick="checkForMiddleClick(this, event);"
                      observes="singleFeedMenuitemState"/>
            <menu id="appmenu_subscribeToPageMenu"
                  class="menu-iconic"
                  label="&subscribeToPageMenupopup.label;"
                  observes="multipleFeedsMenuState">
              <menupopup id="appmenu_subscribeToPageMenupopup"
                         onpopupshowing="return FeedHandler.buildFeedList(event.target);"
                         oncommand="return FeedHandler.subscribeToFeed(null, event);"
                         onclick="checkForMiddleClick(this, event);"/>
            </menu>
            <menuseparator/>
            <menu id="appmenu_bookmarksToolbar"
                  placesanonid="toolbar-autohide"
                  class="menu-iconic bookmark-item"
                  label="&personalbarCmd.label;"
                  container="true">
              <menupopup id="appmenu_bookmarksToolbarPopup"
                         placespopup="true"
                         context="placesContext"
                         onpopupshowing="if (!this.parentNode._placesView)
                                           new PlacesMenu(event, 'place:folder=TOOLBAR');"/>
            </menu>
            <menuseparator/>
            <!-- Bookmarks menu items -->
            <menuseparator builder="end"
                           class="hide-if-empty-places-result"/>
            <menuitem id="appmenu_unsortedBookmarks"
                      label="&appMenuUnsorted.label;"
                      oncommand="PlacesCommandHook.showPlacesOrganizer('UnfiledBookmarks');"
                      class="menuitem-iconic"/>
          </menupopup>
      </splitmenu>
      <splitmenu id="appmenu_history"
                 iconic="true"
                 label="&historyMenu.label;"
                 command="Browser:ShowAllHistory">
          <menupopup id="appmenu_historyMenupopup"
                     placespopup="true"
                     oncommand="this.parentNode._placesView._onCommand(event);"
                     onclick="checkForMiddleClick(this, event);"
                     onpopupshowing="if (!this.parentNode._placesView)
                                       new HistoryMenu(event);"
                     tooltip="bhTooltip"
                     popupsinherittooltip="true">
            <menuitem id="appmenu_showAllHistory"
                      label="&showAllHistoryCmd2.label;"
                      command="Browser:ShowAllHistory"
                      key="showAllHistoryKb"/>
            <menuseparator/>
            <menuitem id="appmenu_sanitizeHistory"
                      label="&clearRecentHistory.label;"
                      key="key_sanitize"
                      command="Tools:Sanitize"/>
            <menuseparator class="hide-if-empty-places-result"/>
#ifdef MOZ_SERVICES_SYNC
            <menuitem id="appmenu_sync-tabs"
                      class="syncTabsMenuItem"
                      label="&syncTabsMenu.label;"
                      oncommand="BrowserOpenSyncTabs();"
                      disabled="true"/>
#endif
            <menuitem id="appmenu_restoreLastSession"
                      class="restoreLastSession"
                      label="&historyRestoreLastSession.label;"
                      oncommand="restoreLastSession();"
                      disabled="true"/>
            <menu id="appmenu_recentlyClosedTabsMenu"
                  class="recentlyClosedTabsMenu"
                  label="&historyUndoMenu.label;"
                  disabled="true">
              <menupopup id="appmenu_recentlyClosedTabsMenupopup"
                         onpopupshowing="document.getElementById('appmenu_history')._placesView.populateUndoSubmenu();"/>
            </menu>
            <menu id="appmenu_recentlyClosedWindowsMenu"
                  class="recentlyClosedWindowsMenu"
                  label="&historyUndoWindowMenu.label;"
                  disabled="true">
              <menupopup id="appmenu_recentlyClosedWindowsMenupopup"
                         onpopupshowing="document.getElementById('appmenu_history')._placesView.populateUndoWindowSubmenu();"/>
            </menu>
            <menuseparator/>
          </menupopup>
      </splitmenu>
      <menuitem id="appmenu_downloads"
                class="menuitem-tooltip"
                label="&downloads.label;"
                command="Tools:Downloads"
                key="key_openDownloads"/>
      <spacer id="appmenuSecondaryPane-spacer"/>
      <menuitem id="appmenu_addons"
                class="menuitem-iconic menuitem-iconic-tooltip"
                label="&addons.label;"
                command="Tools:Addons"
                key="key_openAddons"/>
      <splitmenu id="appmenu_customize"
#ifdef XP_UNIX
                 label="&preferencesCmdUnix.label;"
#else
                 label="&preferencesCmd2.label;"
#endif
                 oncommand="openPreferences();">
          <menupopup id="appmenu_customizeMenu"
                     onpopupshowing="onViewToolbarsPopupShowing(event, document.getElementById('appmenu_toggleTabsOnTop').previousSibling);">
            <menuitem id="appmenu_preferences"
#ifdef XP_UNIX
                      label="&preferencesCmdUnix.label;"
#else
                      label="&preferencesCmd2.label;"
#endif
                      oncommand="openPreferences();"/>
            <menuseparator/>
            <menuseparator/>
            <menuitem id="appmenu_toggleTabsOnTop"
                      label="&viewTabsOnTop.label;"
                      type="checkbox"
                      command="cmd_ToggleTabsOnTop"/>
            <menuitem id="appmenu_toolbarLayout"
                      label="&appMenuToolbarLayout.label;"
                      command="cmd_CustomizeToolbars"/>
          </menupopup>
      </splitmenu>
      <splitmenu id="appmenu_help"
                 label="&helpMenu.label;"
                 oncommand="openHelpLink('firefox-help')">
          <menupopup id="appmenu_helpMenupopup">
            <menuitem id="appmenu_openHelp"
                      label="&helpMenu.label;"
                      oncommand="openHelpLink('firefox-help')"
                      onclick="checkForMiddleClick(this, event);"/>
            <menuitem id="appmenu_gettingStarted"
                      label="&appMenuGettingStarted.label;"
                      oncommand="gBrowser.loadOneTab('http://www.mozilla.com/firefox/central/', {inBackground: false});"
                      onclick="checkForMiddleClick(this, event);"/>
            <menuitem id="appmenu_troubleshootingInfo"
                      label="&helpTroubleshootingInfo.label;"
                      oncommand="openTroubleshootingPage()"
                      onclick="checkForMiddleClick(this,event);"/>
            <menuitem id="appmenu_feedbackPage"
                      label="&helpFeedbackPage.label;"
                      oncommand="openFeedbackPage()"
                      onclick="checkForMiddleClick(this, event);"/>
            <menuseparator/>
            <menuitem id="appmenu_safeMode"
                      label="&appMenuSafeMode.label;"
                      oncommand="safeModeRestart();"/>
            <menuseparator/>
            <menuitem id="appmenu_about"
                      label="&aboutProduct.label;"
                      oncommand="openAboutDialog();"/>
          </menupopup>
      </splitmenu>
    </vbox>
  </hbox>
</menupopup>
