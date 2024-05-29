const path = require("path");
const os = require("os");
const fs = require("fs");
const resizeImg = require("resize-img");

const { app, BrowserWindow, Menu, ipcMain, shell } = require("electron");
const { access } = require("fs");
const isDev = process.env.NODE_ENV !== "development";
const isMac = process.platform === "darwin";
let mainWindow;
let aboutWindow;

//create main window
function createMainWindow() {
  mainWindow = new BrowserWindow({
    title: "Image Resizer",
    width: isDev ? 1000 : 500,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  //OPen devtools if in dev env
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.loadFile(path.join(__dirname, "./renderer/index.html"));
}

//create about window
function createAboutWindow() {
  const aboutWindow = new BrowserWindow({
    title: "About Image Resizer",
    width: 300,
    height: 300,
  });

  aboutWindow.loadFile(path.join(__dirname, "./renderer/about.html"));
}

//App is ready
app.whenReady().then(() => {
  createMainWindow();

  //Implementing the menu

  const mainMenu = Menu.buildFromTemplate(menu);
  Menu.setApplicationMenu(mainMenu);
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});
//Remove main window on close
// mainWindow.on("closed", () => (mainWindow = null));

//Menu Template
const menu = [
  ...(isMac
    ? [
        {
          label: app.name,
          submenu: [
            {
              label: "About",
              click: createAboutWindow,
            },
          ],
        },
      ]
    : []),
  {
    role: "fileMenu",
  },
  ...(!isMac
    ? [
        {
          label: "Help",
          submenu: [
            {
              label: "About",
              click: createAboutWindow,
            },
          ],
        },
      ]
    : []),
];
//respond to ipcRenderer
ipcMain.on("image:resize", (e, options) => {
  options.dest = path.join(os.homedir(), "imageresizer");
  resizeImage(options);
});

// resize image
async function resizeImage({ imgPath, width, height, dest }) {
  try {
    const newPath = await resizeImg(fs.readFileSync(imgPath), {
      width: +width,
      height: +height,
    });
    //create file name
    const fileName = path.basename(imgPath);

    //create dest folder if it does not exist
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest);
    }
    //write the new image to the dest folder
    fs.writeFileSync(path.join(dest, fileName), newPath);

    //send success message
    mainWindow.webContents.send("image:done");

    //open dest folder
    shell.openPath(dest);
  } catch (error) {
    console.log(error);
  }
}

app.on("window-all-closed", () => {
  if (!isMac) {
    app.quit();
  }
});
