/* Make sure that the context menu appears on form elements */

function test() {
  waitForExplicitFinish();

  gBrowser.selectedTab = gBrowser.addTab();
  
  gBrowser.selectedBrowser.addEventListener("load", function() {
    gBrowser.selectedBrowser.removeEventListener("load", arguments.callee, true);

    let doc = gBrowser.contentDocument;
    let testInput = function(type, expected) {
      let element = doc.createElement("input");
      element.setAttribute("type", type);
      doc.body.appendChild(element);
      document.popupNode = element;

      let contentAreaContextMenu = document.getElementById("contentAreaContextMenu");
      let contextMenu = new nsContextMenu(contentAreaContextMenu, gBrowser);

      is(contextMenu.shouldDisplay, expected, "context menu behavior for <input type=" + type + "> is wrong");
    };
    let testElement = function(tag, expected) {
      let element = doc.createElement(tag);
      doc.body.appendChild(element);
      document.popupNode = element;

      let contentAreaContextMenu = document.getElementById("contentAreaContextMenu");
      let contextMenu = new nsContextMenu(contentAreaContextMenu, gBrowser);

      is(contextMenu.shouldDisplay, expected, "context menu behavior for <" + tag + "> is wrong");
    };

    testInput("text", true);
    testInput("password", true);
    testInput("image", true);
    testInput("button", false);
    testInput("submit", false);
    testInput("reset", false);
    testInput("checkbox", false);
    testInput("radio", false);
    testElement("button", false);
    testElement("select", false);
    testElement("option", false);
    testElement("optgroup", false);

    // cleanup
    document.popupNode = null;
    gBrowser.removeCurrentTab();
    finish();
  }, true);
  content.location = "data:text/html,test";
}
