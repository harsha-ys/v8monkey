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
 * The Original Code is Android Sync Client.
 *
 * The Initial Developer of the Original Code is
 * the Mozilla Foundation.
 * Portions created by the Initial Developer are Copyright (C) 2011
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Jason Voll <jvoll@mozilla.com>
 *   Richard Newman <rnewman@mozilla.com>
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

package org.mozilla.gecko.sync.repositories.android;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

import org.json.simple.JSONArray;
import org.json.simple.parser.JSONParser;
import org.json.simple.parser.ParseException;
import org.mozilla.gecko.R;
import org.mozilla.gecko.sync.repositories.NullCursorException;
import org.mozilla.gecko.sync.repositories.domain.BookmarkRecord;
import org.mozilla.gecko.sync.repositories.domain.HistoryRecord;
import org.mozilla.gecko.sync.repositories.domain.PasswordRecord;

import android.content.Context;
import android.database.Cursor;
import android.net.Uri;
import android.util.Log;

public class RepoUtils {

  private static final String LOG_TAG = "DBUtils";

  /**
   * An array of known-special GUIDs.
   */
  public static String[] SPECIAL_GUIDS = new String[] {
    // Mobile and desktop places roots have to come first.
    "mobile",
    "places",
    "toolbar",
    "menu",
    "unfiled"
  };

  /**
   * = A note about folder mapping =
   *
   * Note that _none_ of Places's folders actually have a special GUID. They're all
   * randomly generated. Special folders are indicated by membership in the
   * moz_bookmarks_roots table, and by having the parent `1`.
   *
   * Additionally, the mobile root is annotated. In Firefox Sync, PlacesUtils is
   * used to find the IDs of these special folders.
   *
   * Sync skips over `places` and `tags` when finding IDs.
   *
   * We need to consume records with these various guids, producing a local
   * representation which we are able to stably map upstream.
   *
   * That is:
   *
   * * We should not upload a `places` record or a `tags` record.
   * * We can stably _store_ menu/toolbar/unfiled/mobile as special GUIDs, and set
     * their parent ID as appropriate on upload.
   *
   *
   * = Places folders =
   *
   * guid        root_name   folder_id   parent
   * ----------  ----------  ----------  ----------
   * ?           places      1           0
   * ?           menu        2           1
   * ?           toolbar     3           1
   * ?           tags        4           1
   * ?           unfiled     5           1
   *
   * ?           mobile*     474         1
   *
   *
   * = Fennec folders =
   *
   * guid        folder_id   parent
   * ----------  ----------  ----------
   * mobile      ?           0
   *
  */
  public static final Map<String, String> SPECIAL_GUID_PARENTS;
  static {
    HashMap<String, String> m = new HashMap<String, String>();
    m.put("places",  null);
    m.put("menu",    "places");
    m.put("toolbar", "places");
    m.put("tags",    "places");
    m.put("unfiled", "places");
    m.put("mobile",  "places");
    SPECIAL_GUID_PARENTS = Collections.unmodifiableMap(m);
  }

  /**
   * A map of guids to their localized name strings.
   */
  // Oh, if only we could make this final and initialize it in the static initializer.
  public static Map<String, String> SPECIAL_GUIDS_MAP;
  public static void initialize(Context context) {
    if (SPECIAL_GUIDS_MAP == null) {
      HashMap<String, String> m = new HashMap<String, String>();
      m.put("menu",    context.getString(R.string.bookmarks_folder_menu));
      m.put("places",  context.getString(R.string.bookmarks_folder_places));
      m.put("toolbar", context.getString(R.string.bookmarks_folder_toolbar));
      m.put("unfiled", context.getString(R.string.bookmarks_folder_unfiled));
      m.put("mobile",  context.getString(R.string.bookmarks_folder_mobile));
      SPECIAL_GUIDS_MAP = Collections.unmodifiableMap(m);
    }
  }

  /**
   * A helper class for monotonous SQL querying. Does timing and logging,
   * offers a utility to throw on a null cursor.
   *
   * @author rnewman
   *
   */
  public static class QueryHelper {
    private final Context context;
    private final Uri     uri;
    private final String  tag;

    public QueryHelper(Context context, Uri uri, String tag) {
      this.context = context;
      this.uri     = uri;
      this.tag     = tag;
    }

    public Cursor query(String[] projection, String selection, String[] selectionArgs, String sortOrder) {
      return this.query(null, projection, selection, selectionArgs, sortOrder);
    }

    public Cursor query(String label, String[] projection, String selection, String[] selectionArgs, String sortOrder) {
      String logLabel = (label == null) ? this.tag : this.tag + label;
      long queryStart = android.os.SystemClock.uptimeMillis();
      Cursor c = context.getContentResolver().query(uri, projection, selection, selectionArgs, sortOrder);
      long queryEnd   = android.os.SystemClock.uptimeMillis();
      RepoUtils.queryTimeLogger(logLabel, queryStart, queryEnd);
      return c;
    }

    public Cursor safeQuery(String label, String[] projection, String selection, String[] selectionArgs, String sortOrder) throws NullCursorException {
      Cursor c = this.query(label, projection, selection, selectionArgs, sortOrder);
      if (c == null) {
        Log.e(tag, "Got null cursor exception in " + tag + ((label == null) ? "" : label));
        throw new NullCursorException(null);
      }
      return c;
    }
  }

  public static String getStringFromCursor(Cursor cur, String colId) {
    // TODO: getColumnIndexOrThrow?
    // TODO: don't look up columns by name!
    return cur.getString(cur.getColumnIndex(colId));
  }

  public static long getLongFromCursor(Cursor cur, String colId) {
    return cur.getLong(cur.getColumnIndex(colId));
  }

  public static long getIntFromCursor(Cursor cur, String colId) {
    return cur.getInt(cur.getColumnIndex(colId));
  }

  public static JSONArray getJSONArrayFromCursor(Cursor cur, String colId) {
    String jsonArrayAsString = getStringFromCursor(cur, colId);
    if (jsonArrayAsString == null) {
      return new JSONArray();
    }
    try {
      return (JSONArray) new JSONParser().parse(getStringFromCursor(cur, colId));
    } catch (ParseException e) {
      Log.e(LOG_TAG, "JSON parsing error for " + colId, e);
      return null;
    }
  }

  // Returns android id from the URI that we get after inserting a
  // bookmark into the local Android store.
  public static long getAndroidIdFromUri(Uri uri) {
    String path = uri.getPath();
    int lastSlash = path.lastIndexOf('/');
    return Long.parseLong(path.substring(lastSlash + 1));
  }

  public static BookmarkRecord computeParentFields(BookmarkRecord rec, String suggestedParentID, String suggestedParentName) {
    final String guid = rec.guid;
    if (guid == null) {
      // Oh dear.
      Log.e(LOG_TAG, "No guid in computeParentFields!");
      return null;
    }

    String realParent = SPECIAL_GUID_PARENTS.get(guid);
    if (realParent == null) {
      // No magic parent. Use whatever the caller suggests.
      realParent = suggestedParentID;
    } else {
      Log.d(LOG_TAG, "Ignoring suggested parent ID " + suggestedParentID +
                       " for " + guid + "; using " + realParent);
    }

    if (realParent == null) {
      // Oh dear.
      Log.e(LOG_TAG, "No parent for record " + guid);
      return null;
    }

    // Always set the parent name for special folders back to default.
    String parentName = SPECIAL_GUIDS_MAP.get(realParent);
    if (parentName == null) {
      parentName = suggestedParentName;
    }

    rec.parentID = realParent;
    rec.parentName = parentName;
    return rec;
  }

  // Create a BookmarkRecord object from a cursor on a row containing a Fennec bookmark.
  public static BookmarkRecord bookmarkFromMirrorCursor(Cursor cur, String parentId, String parentName, JSONArray children) {

    String guid = getStringFromCursor(cur, BrowserContract.SyncColumns.GUID);
    String collection = "bookmarks";
    long lastModified = getLongFromCursor(cur, BrowserContract.SyncColumns.DATE_MODIFIED);
    boolean deleted   = getLongFromCursor(cur, BrowserContract.SyncColumns.IS_DELETED) == 1 ? true : false;
    boolean isFolder  = getIntFromCursor(cur, BrowserContract.Bookmarks.IS_FOLDER) == 1;
    BookmarkRecord rec = new BookmarkRecord(guid, collection, lastModified, deleted);

    rec.title = getStringFromCursor(cur, BrowserContract.Bookmarks.TITLE);
    rec.bookmarkURI = getStringFromCursor(cur, BrowserContract.Bookmarks.URL);
    rec.description = getStringFromCursor(cur, BrowserContract.Bookmarks.DESCRIPTION);
    rec.tags = getJSONArrayFromCursor(cur, BrowserContract.Bookmarks.TAGS);
    rec.keyword = getStringFromCursor(cur, BrowserContract.Bookmarks.KEYWORD);
    rec.type = isFolder ? AndroidBrowserBookmarksDataAccessor.TYPE_FOLDER :
                          AndroidBrowserBookmarksDataAccessor.TYPE_BOOKMARK;

    rec.androidID = getLongFromCursor(cur, BrowserContract.Bookmarks._ID);
    rec.androidPosition = getLongFromCursor(cur, BrowserContract.Bookmarks.POSITION);
    rec.children = children;

    // Need to restore the parentId since it isn't stored in content provider.
    // We also take this opportunity to fix up parents for special folders,
    // allowing us to map between the hierarchies used by Fennec and Places.
    return logBookmark(computeParentFields(rec, parentId, parentName));
  }

  private static BookmarkRecord logBookmark(BookmarkRecord rec) {
    try {
      Log.d(LOG_TAG, "Returning bookmark record " + rec.guid + " (" + rec.androidID +
          ", " + rec.parentName + ":" + rec.parentID + ")");
      Log.d(LOG_TAG, "> Title:            " + rec.title);
      Log.d(LOG_TAG, "> Type:             " + rec.type);
      Log.d(LOG_TAG, "> URI:              " + rec.bookmarkURI);
      Log.d(LOG_TAG, "> Android position: " + rec.androidPosition);
      Log.d(LOG_TAG, "> Position:         " + rec.pos);
      if (rec.isFolder()) {
        Log.d(LOG_TAG, "FOLDER: Children are " + (rec.children == null ? "null" : rec.children.toJSONString()));
      }
    } catch (Exception e) {
      Log.d(LOG_TAG, "Exception logging bookmark record " + rec, e);
    }
    return rec;
  }

  //Create a HistoryRecord object from a cursor on a row with a Moz History record in it
  public static HistoryRecord historyFromMirrorCursor(Cursor cur) {

    String guid = getStringFromCursor(cur, BrowserContract.SyncColumns.GUID);
    String collection = "history";
    long lastModified = getLongFromCursor(cur, BrowserContract.SyncColumns.DATE_MODIFIED);
    boolean deleted = getLongFromCursor(cur, BrowserContract.SyncColumns.IS_DELETED) == 1 ? true : false;
    HistoryRecord rec = new HistoryRecord(guid, collection, lastModified, deleted);

    rec.title = getStringFromCursor(cur, BrowserContract.History.TITLE);
    rec.histURI = getStringFromCursor(cur, BrowserContract.History.URL);
    rec.androidID = getLongFromCursor(cur, BrowserContract.History._ID);
    rec.fennecDateVisited = getLongFromCursor(cur, BrowserContract.History.DATE_LAST_VISITED);
    rec.fennecVisitCount = getLongFromCursor(cur, BrowserContract.History.VISITS);

    return logHistory(rec);
  }

  private static HistoryRecord logHistory(HistoryRecord rec) {
    try {
      Log.d(LOG_TAG, "Returning history record " + rec.guid + " (" + rec.androidID + ")");
      Log.d(LOG_TAG, "> Title:            " + rec.title);
      Log.d(LOG_TAG, "> URI:              " + rec.histURI);
      Log.d(LOG_TAG, "> Visited:          " + rec.fennecDateVisited);
      Log.d(LOG_TAG, "> Visits:           " + rec.fennecVisitCount);
    } catch (Exception e) {
      Log.d(LOG_TAG, "Exception logging bookmark record " + rec, e);
    }
    return rec;
  }

  public static PasswordRecord passwordFromMirrorCursor(Cursor cur) {
    
    String guid = getStringFromCursor(cur, BrowserContract.SyncColumns.GUID);
    String collection = "passwords";
    long lastModified = getLongFromCursor(cur, BrowserContract.SyncColumns.DATE_MODIFIED);
    boolean deleted = getLongFromCursor(cur, BrowserContract.SyncColumns.IS_DELETED) == 1 ? true : false;
    PasswordRecord rec = new PasswordRecord(guid, collection, lastModified, deleted);
    rec.hostname = getStringFromCursor(cur, BrowserContract.Passwords.HOSTNAME);
    rec.httpRealm = getStringFromCursor(cur, BrowserContract.Passwords.HTTP_REALM);
    rec.formSubmitURL = getStringFromCursor(cur, BrowserContract.Passwords.FORM_SUBMIT_URL);
    rec.usernameField = getStringFromCursor(cur, BrowserContract.Passwords.USERNAME_FIELD);
    rec.passwordField = getStringFromCursor(cur, BrowserContract.Passwords.PASSWORD_FIELD);
    rec.encType = getStringFromCursor(cur, BrowserContract.Passwords.ENC_TYPE);
    
    // TODO decryption of username/password here (Bug 711636)
    rec.username = getStringFromCursor(cur, BrowserContract.Passwords.ENCRYPTED_USERNAME);
    rec.password = getStringFromCursor(cur, BrowserContract.Passwords.ENCRYPTED_PASSWORD);
    
    rec.timeLastUsed = getLongFromCursor(cur, BrowserContract.Passwords.TIME_LAST_USED);
    rec.timesUsed = getLongFromCursor(cur, BrowserContract.Passwords.TIMES_USED);
    
    return rec;
  }
  
  public static void queryTimeLogger(String methodCallingQuery, long queryStart, long queryEnd) {
    long elapsedTime = queryEnd - queryStart;
    Log.i(LOG_TAG, "Query timer: " + methodCallingQuery + " took " + elapsedTime + "ms.");
  }

  public static boolean stringsEqual(String a, String b) {
    // Check for nulls
    if (a == b) return true;
    if (a == null && b != null) return false;
    if (a != null && b == null) return false;
    
    return a.equals(b);
  }
}
