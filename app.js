const Dropbox = require("dropbox").Dropbox;

const accessToken = require("./config.json").accessToken;

const state = {
    files: [],
    rootPath: "",
};

const dbx = new Dropbox({ accessToken, fetch });
const listOfFiles = document.querySelector(".files-list");
const path = document.querySelector(".breadcrumb");
const fileSrc = document.querySelector(".file-src");
const downloadBtn = document.querySelector(".download-btn");

const init = async () => {
    downloadBtn.classList.remove("btn-success");
    downloadBtn.classList.add("disabled", "btn-failure");
    const response = await dbx.filesListFolder({
        path: state.rootPath,
        limit: 20,
    });

    updateFiles(response.entries);
    if (response.has_more) {
        await getMoreFiles(response.cursor, more => updateFiles(more.entries));
    }
};

const getMoreFiles = async (cursor, callback) => {
    const response = await dbx.filesListFolderContinue({ cursor });
    if (callback) {
        callback(response);
    }

    if (response.has_more) {
        await getMoreFiles(response.cursor, callback);
    }
};

const updateFiles = files => {
    state.files = [...state.files, ...files];
    renderFiles();
    setBreadcrumbs();
};

const renderFiles = () => {
    listOfFiles.innerHTML = state.files
        .sort((a, b) => {
            if (
                (a[".tag"] === "folder" || b[".tag"] === "folder") &&
                !(a[".tag"] === b[".tag"])
            ) {
                return a[".tag"] === "folder" ? -1 : 1;
            } else {
                return a.name.toLowerCase() < b.name.toLowerCase() ? 1 : -1;
            }
        })
        .map(file => {
            let fileType = file[".tag"];
            let icon =
                fileType === "folder"
                    ? "<i class='far fa-folder'></i>"
                    : "<i class='far fa-file-pdf'></i>";

            return `<li class="${fileType}"><div style="width: min-content; padding-right: 3%">${icon}</div>${
                file.name
            }</li>`;
        });

    const files = [...document.querySelectorAll("li")].filter(
        type => type["className"] === "file"
    );
    const folders = [...document.querySelectorAll("li")].filter(
        type => type["className"] === "folder"
    );

    files.map(file => {
        file.addEventListener("click", () => {
            let path = state.rootPath === "/" ? state.rootPath : state.rootPath + "/";
            downloadFile(path + file.innerText);
        });
    });

    folders.map(folder => {
        folder.addEventListener("click", () => {
            state.rootPath = (state.rootPath === ""
                    ? "/" + folder.innerText
                    : state.rootPath + folder.innerText
            ).toLowerCase();

            state.files = [];
            init();
        });
    });
};

const uploadFile = async file => {
    await dbx.filesUpload({
        path: state.rootPath + "/" + file.name,
        contents: file,
    });
    state.files = [];
    init();
};

document.querySelector(".upload-btn").addEventListener("click", () => {
    uploadFile(fileSrc.files[0]);
});

const downloadFile = async file => {
    dbx.filesDownload({ path: file }).then(data => {
        let downloadURL = URL.createObjectURL(data.fileBlob);
        downloadBtn.setAttribute("href", downloadURL);
        downloadBtn.setAttribute("download", data.name);
        downloadBtn.classList.remove("btn-failure", "disabled");
        downloadBtn.classList.add("btn-success");
    });
};

const setBreadcrumbs = () => {
    const crumbs = state.rootPath.split("/");

    const sentenceCase = string =>
        string
            .split(" ")
            .map(word => {
                let temp = word;
                return word[0].toUpperCase() + temp.substring(1);
            })
            .join(" ");
    crumbs[0] = "Home";
    let result = "";
    crumbs.forEach(crumb => {
        result += `<div class="breadcrumb-item goto" id="${crumb.toLowerCase()}">${sentenceCase(
            crumb
        )}</div>`;
    });
    path.innerHTML = result;

    const redirects = [...document.querySelectorAll(".goto")];

    redirects.map(redirect => {
        redirect.addEventListener("click", () => {
            let path = redirect.id;
            path = path === "home" ? "" : path;
            state.rootPath = path;
            state.files = [];
            init();
        });
    });
};

init();
