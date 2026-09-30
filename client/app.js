/* =========================================================
   DROPBOX LOCAL
   FULLY FUNCTIONAL FRONTEND
========================================================= */

"use strict";

document.addEventListener("DOMContentLoaded", () => {

    console.log("DropBox Local loaded");


    /* =====================================================
       ELEMENT HELPER
    ===================================================== */

    function getElement(...ids) {

        for (const id of ids) {

            const element =
                document.getElementById(id);

            if (element) {
                return element;
            }

        }

        return null;
    }


    /* =====================================================
       ELEMENTS
    ===================================================== */

    const fileInput =
        getElement("fileInput");

    const browseBtn =
        getElement(
            "browseBtn",
            "chooseBtn"
        );

    const dropZone =
        getElement("dropZone");

    const selectedFilesSection =
        getElement(
            "selectedFilesSection",
            "selectedFiles"
        );

    const fileList =
        getElement("fileList");

    const selectedCount =
        getElement("selectedCount");

    const clearFilesBtn =
        getElement("clearFilesBtn");

    const uploadBtn =
        getElement(
            "uploadBtn",
            "uploadAllBtn"
        );

    const uploadProgress =
        getElement("uploadProgress");

    const progressFill =
        getElement("progressFill");

    const progressText =
        getElement("progressText");

    const progressPercent =
        getElement("progressPercent");

    const uploadError =
        getElement("uploadError");

    const shareResult =
        getElement(
            "shareResult",
            "resultSection"
        );

    const shareCode =
        getElement("shareCode");

    const shareLink =
        getElement("shareLink");

    const copyCodeBtn =
        getElement("copyCodeBtn");

    const copyLinkBtn =
        getElement("copyLinkBtn");

    const qrContainer =
        getElement("qrContainer");

    const newUploadBtn =
        getElement("newUploadBtn");

    const receiveForm =
        getElement("receiveForm");

    const codeInput =
        getElement("codeInput");

    const receiveBtn =
        getElement("receiveBtn");

    const receiveError =
        getElement(
            "receiveError",
            "receiveMessage"
        );

    const receiveResult =
        getElement(
            "receiveResult",
            "downloadCard"
        );

    const receivedFiles =
        getElement(
            "receivedFiles"
        );

    const downloadAllBtn =
        getElement(
            "downloadAllBtn"
        );

    const expiryBadge =
        getElement(
            "expiryBadge",
            "receiveExpiry"
        );

    const downloadBtn =
        getElement("downloadBtn");

    const downloadFileName =
        getElement("downloadFileName");

    const downloadFileSize =
        getElement("downloadFileSize");

    const toast =
        getElement("toast");

    const toastIcon =
        getElement("toastIcon");

    const toastMessage =
        getElement("toastMessage");

    const currentYear =
        getElement("currentYear");

    const mobileMenuBtn =
        getElement("mobileMenuBtn");

    const mobileMenu =
        getElement("mobileMenu");

    const statusDot =
        getElement("statusDot");

    const statusText =
        getElement("statusText");


    /* =====================================================
       STATE
    ===================================================== */

    let selectedFiles = [];

    let currentShareData = null;

    let expiryTimer = null;

    let toastTimer = null;


    /* =====================================================
       INITIALIZATION
    ===================================================== */

    if (currentYear) {

        currentYear.textContent =
            new Date().getFullYear();

    }


    setupFilePicker();

    setupDragAndDrop();

    setupUpload();

    setupClearButton();

    setupCopyButtons();

    setupReceive();

    setupNewUpload();

    setupMobileMenu();

    checkServer();

    checkUrlForCode();


    /* =====================================================
       FILE PICKER
    ===================================================== */

    function setupFilePicker() {

        if (!fileInput) {

            console.error(
                "fileInput not found"
            );

            return;

        }


        if (browseBtn) {

            browseBtn.addEventListener(
                "click",
                (event) => {

                    event.preventDefault();

                    event.stopPropagation();

                    console.log(
                        "Browse button clicked"
                    );

                    fileInput.click();

                }
            );

        }


        if (dropZone) {

            dropZone.addEventListener(
                "click",
                (event) => {

                    /*
                     * Don't trigger the file picker
                     * if an actual button was clicked.
                     */

                    if (
                        event.target.closest(
                            "button"
                        )
                    ) {

                        return;

                    }


                    if (
                        event.target.closest(
                            ".remove-file"
                        )
                    ) {

                        return;

                    }


                    if (
                        event.target.closest(
                            ".remove-file-btn"
                        )
                    ) {

                        return;

                    }


                    fileInput.click();

                }
            );

        }


        fileInput.addEventListener(
            "change",
            (event) => {

                console.log(
                    "FILE CHANGE EVENT FIRED"
                );


                const files =
                    Array.from(
                        event.target.files || []
                    );


                console.log(
                    "Selected files:",
                    files
                );


                addFiles(files);


                /*
                 * Allows the user to select
                 * the same file again.
                 */

                fileInput.value = "";

            }
        );

    }


    /* =====================================================
       DRAG & DROP
    ===================================================== */

    function setupDragAndDrop() {

        if (!dropZone) {
            return;
        }


        dropZone.addEventListener(
            "dragenter",
            handleDragEnter
        );

        dropZone.addEventListener(
            "dragover",
            handleDragEnter
        );

        dropZone.addEventListener(
            "dragleave",
            handleDragLeave
        );

        dropZone.addEventListener(
            "drop",
            handleDrop
        );

    }


    function handleDragEnter(event) {

        event.preventDefault();

        event.stopPropagation();

        dropZone.classList.add(
            "drag-over"
        );

        dropZone.classList.add(
            "dragging"
        );

    }


    function handleDragLeave(event) {

        event.preventDefault();

        event.stopPropagation();

        /*
         * Only remove when leaving the
         * complete drop zone.
         */

        if (
            event.relatedTarget &&
            dropZone.contains(
                event.relatedTarget
            )
        ) {

            return;

        }


        dropZone.classList.remove(
            "drag-over"
        );

        dropZone.classList.remove(
            "dragging"
        );

    }


    function handleDrop(event) {

        event.preventDefault();

        event.stopPropagation();

        dropZone.classList.remove(
            "drag-over"
        );

        dropZone.classList.remove(
            "dragging"
        );


        const files =
            Array.from(
                event.dataTransfer.files || []
            );


        console.log(
            "Dropped files:",
            files
        );


        addFiles(files);

    }


    /* =====================================================
       ADD FILES
    ===================================================== */

    function addFiles(files) {

        if (
            !files ||
            files.length === 0
        ) {

            return;

        }


        hideUploadError();


        let added = 0;


        files.forEach(
            (file) => {

                /*
                 * Maximum 50 files.
                 */

                if (
                    selectedFiles.length >= 50
                ) {

                    return;

                }


                const duplicate =
                    selectedFiles.some(
                        (existing) => {

                            return (
                                existing.name ===
                                    file.name &&
                                existing.size ===
                                    file.size &&
                                existing.lastModified ===
                                    file.lastModified
                            );

                        }
                    );


                if (!duplicate) {

                    selectedFiles.push(
                        file
                    );

                    added++;

                }

            }
        );


        console.log(
            "Current selected files:",
            selectedFiles
        );


        renderSelectedFiles();


        if (added > 0) {

            showToast(
                "success",
                `${added} file${
                    added === 1
                        ? ""
                        : "s"
                } selected`
            );

        }

    }


    /* =====================================================
       RENDER SELECTED FILES
    ===================================================== */

    function renderSelectedFiles() {

        if (!fileList) {

            console.error(
                "fileList not found"
            );

            return;

        }


        fileList.innerHTML = "";


        if (
            selectedFiles.length === 0
        ) {

            setSectionVisible(
                selectedFilesSection,
                false
            );

            updateSelectedCount();

            return;

        }


        setSectionVisible(
            selectedFilesSection,
            true
        );


        updateSelectedCount();


        selectedFiles.forEach(
            (file, index) => {

                const item =
                    document.createElement(
                        "div"
                    );


                /*
                 * Support both CSS versions.
                 */

                item.className =
                    "file-item selected-file";


                /* -------------------------
                   ICON
                ------------------------- */

                const icon =
                    document.createElement(
                        "div"
                    );


                icon.className =
                    "file-icon selected-file-icon";


                icon.textContent =
                    getFileIcon(file.name);


                /* -------------------------
                   DETAILS
                ------------------------- */

                const details =
                    document.createElement(
                        "div"
                    );


                details.className =
                    "file-details selected-file-info";


                const name =
                    document.createElement(
                        "span"
                    );


                name.className =
                    "file-name";


                name.textContent =
                    file.name;


                const size =
                    document.createElement(
                        "span"
                    );


                size.className =
                    "file-size";


                size.textContent =
                    formatFileSize(
                        file.size
                    );


                details.appendChild(
                    name
                );

                details.appendChild(
                    size
                );


                /* -------------------------
                   REMOVE
                ------------------------- */

                const removeBtn =
                    document.createElement(
                        "button"
                    );


                removeBtn.type =
                    "button";


                removeBtn.className =
                    "remove-file remove-file-btn";


                removeBtn.textContent =
                    "×";


                removeBtn.title =
                    "Remove file";


                removeBtn.setAttribute(
                    "aria-label",
                    `Remove ${file.name}`
                );


                removeBtn.addEventListener(
                    "click",
                    (event) => {

                        event.preventDefault();

                        event.stopPropagation();


                        selectedFiles.splice(
                            index,
                            1
                        );


                        renderSelectedFiles();

                    }
                );


                item.appendChild(
                    icon
                );

                item.appendChild(
                    details
                );

                item.appendChild(
                    removeBtn
                );


                fileList.appendChild(
                    item
                );

            }
        );

    }


    /* =====================================================
       SELECTED COUNT
    ===================================================== */

    function updateSelectedCount() {

        if (!selectedCount) {
            return;
        }


        selectedCount.textContent =
            `${selectedFiles.length} file${
                selectedFiles.length === 1
                    ? ""
                    : "s"
            }`;

    }


    /* =====================================================
       SHOW / HIDE SECTION
    ===================================================== */

    function setSectionVisible(
        element,
        visible
    ) {

        if (!element) {
            return;
        }


        if ("hidden" in element) {

            element.hidden =
                !visible;

        }


        if (visible) {

            element.classList.remove(
                "hidden"
            );

        } else {

            element.classList.add(
                "hidden"
            );

        }

    }


    /* =====================================================
       CLEAR FILES
    ===================================================== */

    function setupClearButton() {

        if (!clearFilesBtn) {
            return;
        }


        clearFilesBtn.addEventListener(
            "click",
            () => {

                selectedFiles = [];

                renderSelectedFiles();

                hideUploadError();

                showToast(
                    "success",
                    "Files cleared"
                );

            }
        );

    }


    /* =====================================================
       UPLOAD
    ===================================================== */

    function setupUpload() {

        if (!uploadBtn) {

            console.error(
                "Upload button not found"
            );

            return;

        }


        uploadBtn.addEventListener(
            "click",
            (event) => {

                event.preventDefault();

                uploadFiles();

            }
        );

    }


    async function uploadFiles() {

        if (
            selectedFiles.length === 0
        ) {

            showUploadError(
                "Please select at least one file."
            );

            return;

        }


        hideUploadError();


        uploadBtn.disabled =
            true;


        const originalText =
            uploadBtn.textContent;


        uploadBtn.textContent =
            "Uploading...";


        if (uploadProgress) {

            setSectionVisible(
                uploadProgress,
                true
            );

        }


        if (shareResult) {

            setSectionVisible(
                shareResult,
                false
            );

        }


        setProgress(
            0,
            "Preparing upload..."
        );


        try {

            const formData =
                new FormData();


            /*
             * IMPORTANT:
             * Backend expects:
             *
             * files
             *
             * not "file".
             */

            selectedFiles.forEach(
                (file) => {

                    formData.append(
                        "files",
                        file,
                        file.name
                    );

                }
            );


            console.log(
                "Uploading",
                selectedFiles.length,
                "files..."
            );


            const result =
                await uploadWithProgress(
                    "/api/upload",
                    formData
                );


            console.log(
                "Upload response:",
                result
            );


            if (
                !result ||
                result.success !== true
            ) {

                throw new Error(
                    result?.message ||
                    "Upload failed."
                );

            }


            currentShareData =
                result;


            setProgress(
                100,
                "Upload complete"
            );


            showShareResult(
                result
            );


            showToast(
                "success",
                "Files uploaded successfully"
            );


        } catch (error) {

            console.error(
                "UPLOAD ERROR:",
                error
            );


            showUploadError(
                friendlyError(
                    error
                )
            );


            showToast(
                "error",
                "Upload failed"
            );

        } finally {

            uploadBtn.disabled =
                false;


            uploadBtn.textContent =
                originalText;

        }

    }


    /* =====================================================
       XHR UPLOAD
    ===================================================== */

    function uploadWithProgress(
        url,
        formData
    ) {

        return new Promise(
            (resolve, reject) => {

                const xhr =
                    new XMLHttpRequest();


                xhr.open(
                    "POST",
                    url,
                    true
                );


                xhr.timeout =
                    10 * 60 * 1000;


                xhr.upload.addEventListener(
                    "progress",
                    (event) => {

                        if (
                            !event.lengthComputable
                        ) {

                            return;

                        }


                        const percent =
                            Math.round(
                                (
                                    event.loaded /
                                    event.total
                                ) * 100
                            );


                        setProgress(
                            percent,
                            percent >= 100
                                ? "Processing..."
                                : "Uploading..."
                        );

                    }
                );


                xhr.onload =
                    async () => {

                        let data =
                            null;


                        try {

                            data =
                                xhr.responseText
                                    ? JSON.parse(
                                        xhr.responseText
                                    )
                                    : null;

                        } catch {

                            data = null;

                        }


                        if (
                            xhr.status >= 200 &&
                            xhr.status < 300
                        ) {

                            resolve(
                                data
                            );

                            return;

                        }


                        reject(
                            new Error(
                                data?.message ||
                                `Server error (${xhr.status})`
                            )
                        );

                    };


                xhr.onerror =
                    () => {

                        reject(
                            new Error(
                                "Could not connect to the server."
                            )
                        );

                    };


                xhr.ontimeout =
                    () => {

                        reject(
                            new Error(
                                "Upload timed out."
                            )
                        );

                    };


                xhr.send(
                    formData
                );

            }
        );

    }


    /* =====================================================
       PROGRESS
    ===================================================== */

    function setProgress(
        percent,
        message
    ) {

        const value =
            Math.max(
                0,
                Math.min(
                    100,
                    Number(percent) || 0
                )
            );


        if (progressFill) {

            progressFill.style.width =
                `${value}%`;

        }


        if (progressPercent) {

            progressPercent.textContent =
                `${value}%`;

        }


        if (progressText) {

            progressText.textContent =
                message || "";

        }

    }


    /* =====================================================
       SHOW SHARE RESULT
    ===================================================== */

    function showShareResult(
        data
    ) {

        const code =
            String(
                data.code ||
                data.shareCode ||
                ""
            ).trim().toUpperCase();


        if (!code) {

            console.error(
                "No share code received:",
                data
            );

            showUploadError(
                "Upload succeeded, but the server did not return a share code."
            );

            return;

        }


        const link =
            data.shareUrl ||
            data.shareLink ||
            `${window.location.origin}/?code=${encodeURIComponent(code)}`;


        if (shareCode) {

            shareCode.textContent =
                code;

        }


        if (shareLink) {

            /*
             * Could be an input OR a normal element.
             */

            if (
                "value" in shareLink
            ) {

                shareLink.value =
                    link;

            } else {

                shareLink.textContent =
                    link;

            }

        }


        if (shareResult) {

            setSectionVisible(
                shareResult,
                true
            );

        }


        if (qrContainer) {

            loadQr(
                code,
                link
            );

        }


        /*
         * If current HTML uses resultSection,
         * scroll to it.
         */

        shareResult?.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });

    }


    /* =====================================================
       QR
    ===================================================== */

    function loadQr(
        code,
        link
    ) {

        if (!qrContainer) {
            return;
        }


        qrContainer.innerHTML = "";


        const image =
            document.createElement(
                "img"
            );


        image.alt =
            "Share QR Code";


        image.loading =
            "lazy";


        image.src =
            `/api/qr/${encodeURIComponent(
                code
            )}?url=${encodeURIComponent(
                link
            )}`;


        image.addEventListener(
            "error",
            () => {

                console.error(
                    "QR generation failed"
                );


                qrContainer.innerHTML =
                    "<span>QR unavailable</span>";

            }
        );


        qrContainer.appendChild(
            image
        );

    }


    /* =====================================================
       COPY BUTTONS
    ===================================================== */

    function setupCopyButtons() {

        if (copyCodeBtn) {

            copyCodeBtn.addEventListener(
                "click",
                async () => {

                    const code =
                        shareCode?.textContent
                            ?.trim() || "";


                    if (!code) {
                        return;
                    }


                    const success =
                        await copyText(
                            code
                        );


                    showToast(
                        success
                            ? "success"
                            : "error",
                        success
                            ? "Share code copied"
                            : "Could not copy code"
                    );

                }
            );

        }


        if (copyLinkBtn) {

            copyLinkBtn.addEventListener(
                "click",
                async () => {

                    let link = "";


                    if (
                        shareLink &&
                        "value" in shareLink
                    ) {

                        link =
                            shareLink.value;

                    } else {

                        link =
                            shareLink?.textContent ||
                            "";

                    }


                    if (!link) {
                        return;
                    }


                    const success =
                        await copyText(
                            link
                        );


                    showToast(
                        success
                            ? "success"
                            : "error",
                        success
                            ? "Share link copied"
                            : "Could not copy link"
                    );

                }
            );

        }

    }


    /* =====================================================
       COPY
    ===================================================== */

    async function copyText(
        text
    ) {

        try {

            if (
                navigator.clipboard
            ) {

                await navigator.clipboard.writeText(
                    text
                );

                return true;

            }

        } catch {

            // fallback below

        }


        try {

            const textarea =
                document.createElement(
                    "textarea"
                );


            textarea.value =
                text;


            textarea.style.position =
                "fixed";

            textarea.style.left =
                "-9999px";


            document.body.appendChild(
                textarea
            );


            textarea.focus();

            textarea.select();


            const success =
                document.execCommand(
                    "copy"
                );


            textarea.remove();


            return success;

        } catch {

            return false;

        }

    }


    /* =====================================================
       RECEIVE
    ===================================================== */

    function setupReceive() {

        if (receiveForm) {

            receiveForm.addEventListener(
                "submit",
                (event) => {

                    event.preventDefault();

                    findFiles();

                }
            );

        }


        if (receiveBtn) {

            receiveBtn.addEventListener(
                "click",
                (event) => {

                    event.preventDefault();

                    findFiles();

                }
            );

        }


        if (codeInput) {

            codeInput.addEventListener(
                "input",
                () => {

                    codeInput.value =
                        codeInput.value
                            .replace(
                                /[^a-zA-Z0-9]/g,
                                ""
                            )
                            .toUpperCase()
                            .slice(0, 8);

                }
            );


            codeInput.addEventListener(
                "keydown",
                (event) => {

                    if (
                        event.key === "Enter"
                    ) {

                        event.preventDefault();

                        findFiles();

                    }

                }
            );

        }

    }


    /* =====================================================
       FIND FILES
    ===================================================== */

    async function findFiles(
        codeOverride = null
    ) {

        hideReceiveError();


        const code =
            String(
                codeOverride ||
                codeInput?.value ||
                ""
            )
                .trim()
                .toUpperCase();


        if (!code) {

            showReceiveError(
                "Please enter a share code."
            );

            return;

        }


        if (
            receiveBtn
        ) {

            receiveBtn.disabled =
                true;

            receiveBtn.textContent =
                "Checking...";

        }


        try {

            console.log(
                "Searching:",
                code
            );


            const response =
                await fetch(
                    `/api/file/${encodeURIComponent(
                        code
                    )}`
                );


            let data =
                null;


            try {

                data =
                    await response.json();

            } catch {

                data = null;

            }


            if (!response.ok) {

                throw new Error(
                    data?.message ||
                    "File not found."
                );

            }


            if (
                data?.success === false
            ) {

                throw new Error(
                    data.message ||
                    "File not found."
                );

            }


            currentShareData =
                data;


            showReceiveResult(
                data,
                code
            );


            showToast(
                "success",
                "File found"
            );


        } catch (error) {

            console.error(
                "Receive error:",
                error
            );


            showReceiveError(
                friendlyError(
                    error
                )
            );


            showToast(
                "error",
                "File not found"
            );

        } finally {

            if (receiveBtn) {

                receiveBtn.disabled =
                    false;

                receiveBtn.textContent =
                    "Receive";

            }

        }

    }


    /* =====================================================
       SHOW RECEIVE RESULT
    ===================================================== */

    function showReceiveResult(
        data,
        code
    ) {

        const files =
            normalizeFiles(
                data
            );


        /*
         * New-style receive UI
         */

        if (receivedFiles) {

            receivedFiles.innerHTML =
                "";


            files.forEach(
                (file) => {

                    renderReceivedFile(
                        file,
                        code
                    );

                }
            );

        }


        /*
         * Old/single-file receive UI
         */

        if (
            downloadFileName &&
            files.length > 0
        ) {

            downloadFileName.textContent =
                files.length === 1
                    ? getFileName(files[0])
                    : `${files.length} files`;

        }


        if (
            downloadFileSize &&
            files.length > 0
        ) {

            downloadFileSize.textContent =
                files.length === 1
                    ? formatFileSize(
                        files[0].size
                    )
                    : `${files.length} files available`;

        }


        if (
            downloadBtn &&
            files.length > 0
        ) {

            downloadBtn.href =
                getDownloadUrl(
                    files[0],
                    code
                );

        }


        if (
            receiveResult
        ) {

            setSectionVisible(
                receiveResult,
                true
            );

        }


        updateExpiry(
            data
        );


        /*
         * Download all / first button
         */

        if (downloadAllBtn) {

            downloadAllBtn.onclick =
                () => {

                    downloadAll(
                        files,
                        code
                    );

                };

        }

    }


    /* =====================================================
       NORMALIZE FILES
    ===================================================== */

    function normalizeFiles(
        data
    ) {

        if (
            Array.isArray(
                data?.files
            )
        ) {

            return data.files;

        }


        if (
            Array.isArray(
                data?.file
            )
        ) {

            return data.file;

        }


        if (
            data?.file &&
            typeof data.file ===
                "object"
        ) {

            return [
                data.file
            ];

        }


        /*
         * Single-file compatibility.
         */

        if (
            data?.fileName ||
            data?.filename ||
            data?.originalName ||
            data?.name
        ) {

            return [
                {
                    id:
                        data.id ||
                        null,

                    name:
                        data.fileName ||
                        data.originalName ||
                        data.filename ||
                        data.name,

                    filename:
                        data.filename ||
                        data.storedName ||
                        null,

                    size:
                        Number(
                            data.size || 0
                        ),

                    type:
                        data.type ||
                        data.mimetype ||
                        "",

                    downloadUrl:
                        data.downloadUrl ||
                        null
                }
            ];

        }


        return [];

    }


    /* =====================================================
       RENDER RECEIVED FILE
    ===================================================== */

    function renderReceivedFile(
        file,
        code
    ) {

        if (!receivedFiles) {
            return;
        }


        const item =
            document.createElement(
                "div"
            );


        item.className =
            "received-file";


        const icon =
            document.createElement(
                "div"
            );


        icon.className =
            "file-icon";


        icon.textContent =
            getFileIcon(
                getFileName(file)
            );


        const info =
            document.createElement(
                "div"
            );


        info.className =
            "received-file-info";


        const name =
            document.createElement(
                "span"
            );


        name.className =
            "received-file-name";


        name.textContent =
            getFileName(file);


        const size =
            document.createElement(
                "span"
            );


        size.className =
            "received-file-size";


        size.textContent =
            formatFileSize(
                file.size
            );


        info.appendChild(
            name
        );

        info.appendChild(
            size
        );


        const download =
            document.createElement(
                "a"
            );


        download.className =
            "file-download-link";


        download.textContent =
            "Download";


        download.href =
            getDownloadUrl(
                file,
                code
            );


        /*
         * Do NOT use target=_blank here.
         * Browser will directly download the file.
         */

        download.setAttribute(
            "download",
            ""
        );


        item.appendChild(
            icon
        );

        item.appendChild(
            info
        );

        item.appendChild(
            download
        );


        receivedFiles.appendChild(
            item
        );

    }


    /* =====================================================
       DOWNLOAD URL
    ===================================================== */

    function getDownloadUrl(
        file,
        code
    ) {

        /*
         * Backend may already return a URL.
         */

        if (
            file?.downloadUrl
        ) {

            /*
             * Current backend sometimes returns:
             * /api/download/CODE
             *
             * For individual files we can improve
             * it using the file ID.
             */

            if (
                file.id &&
                file.downloadUrl.includes(
                    "/api/download/"
                ) &&
                !file.downloadUrl.includes(
                    file.id
                )
            ) {

                return (
                    `/api/download/${encodeURIComponent(
                        code
                    )}/${encodeURIComponent(
                        file.id
                    )}`
                );

            }


            return file.downloadUrl;

        }


        if (
            file?.download_url
        ) {

            return file.download_url;

        }


        if (
            file?.url
        ) {

            return file.url;

        }


        /*
         * Current backend supports:
         *
         * /api/download/:code/:fileId
         */

        if (
            file?.id
        ) {

            return (
                `/api/download/${encodeURIComponent(
                    code
                )}/${encodeURIComponent(
                    file.id
                )}`
            );

        }


        /*
         * Single-file fallback.
         */

        return (
            `/api/download/${encodeURIComponent(
                code
            )}`
        );

    }


    /* =====================================================
       DOWNLOAD ALL
    ===================================================== */

    function downloadAll(
        files,
        code
    ) {

        if (
            !files ||
            files.length === 0
        ) {

            return;

        }


        /*
         * One file
         */

        if (
            files.length === 1
        ) {

            window.location.href =
                getDownloadUrl(
                    files[0],
                    code
                );

            return;

        }


        /*
         * Multiple files:
         * Current backend has individual
         * download endpoint.
         *
         * Trigger each one sequentially.
         */

        files.forEach(
            (file, index) => {

                setTimeout(
                    () => {

                        const link =
                            document.createElement(
                                "a"
                            );


                        link.href =
                            getDownloadUrl(
                                file,
                                code
                            );


                        link.download =
                            getFileName(
                                file
                            );


                        document.body.appendChild(
                            link
                        );


                        link.click();


                        link.remove();

                    },
                    index * 700
                );

            }
        );

    }


    /* =====================================================
       EXPIRY
    ===================================================== */

    function updateExpiry(
        data
    ) {

        if (!expiryBadge) {
            return;
        }


        const expiry =
            data?.expiresAt ||
            data?.expiry ||
            data?.expires_at;


        if (!expiry) {

            expiryBadge.textContent =
                "Temporary file";

            return;

        }


        const expiryTime =
            new Date(
                expiry
            ).getTime();


        if (
            Number.isNaN(
                expiryTime
            )
        ) {

            expiryBadge.textContent =
                "Temporary file";

            return;

        }


        if (expiryTimer) {

            clearInterval(
                expiryTimer
            );

        }


        function update() {

            const remaining =
                expiryTime -
                Date.now();


            if (
                remaining <= 0
            ) {

                expiryBadge.textContent =
                    "Expired";

                clearInterval(
                    expiryTimer
                );

                return;

            }


            const totalSeconds =
                Math.floor(
                    remaining / 1000
                );


            const minutes =
                Math.floor(
                    totalSeconds / 60
                );


            const seconds =
                totalSeconds % 60;


            expiryBadge.textContent =
                `Expires in ${minutes}m ${String(
                    seconds
                ).padStart(
                    2,
                    "0"
                )}s`;

        }


        update();


        expiryTimer =
            setInterval(
                update,
                1000
            );

    }


    /* =====================================================
       NEW UPLOAD
    ===================================================== */

    function setupNewUpload() {

        if (!newUploadBtn) {
            return;
        }


        newUploadBtn.addEventListener(
            "click",
            () => {

                selectedFiles = [];

                currentShareData =
                    null;


                renderSelectedFiles();


                if (shareResult) {

                    setSectionVisible(
                        shareResult,
                        false
                    );

                }


                if (uploadProgress) {

                    setSectionVisible(
                        uploadProgress,
                        false
                    );

                }


                window.scrollTo({
                    top: 0,
                    behavior: "smooth"
                });

            }
        );

    }


    /* =====================================================
       URL SHARE CODE
    ===================================================== */

    function checkUrlForCode() {

        const params =
            new URLSearchParams(
                window.location.search
            );


        const code =
            params.get("code");


        if (!code) {
            return;
        }


        const cleanCode =
            code
                .trim()
                .toUpperCase();


        if (codeInput) {

            codeInput.value =
                cleanCode;

        }


        setTimeout(
            () => {

                findFiles(
                    cleanCode
                );

            },
            300
        );

    }


    /* =====================================================
       SERVER STATUS
    ===================================================== */

    async function checkServer() {

        try {

            const response =
                await fetch(
                    "/api/health",
                    {
                        cache: "no-store"
                    }
                );


            if (
                !response.ok
            ) {

                throw new Error();

            }


            if (statusDot) {

                statusDot.classList.add(
                    "online"
                );

            }


            if (statusText) {

                statusText.textContent =
                    "Server online";

            }


        } catch {

            if (statusText) {

                statusText.textContent =
                    "Server offline";

            }

        }

    }


    /* =====================================================
       MOBILE MENU
    ===================================================== */

    function setupMobileMenu() {

        if (
            !mobileMenuBtn ||
            !mobileMenu
        ) {

            return;

        }


        mobileMenuBtn.addEventListener(
            "click",
            () => {

                mobileMenu.classList.toggle(
                    "open"
                );

            }
        );


        mobileMenu
            .querySelectorAll("a")
            .forEach(
                (link) => {

                    link.addEventListener(
                        "click",
                        () => {

                            mobileMenu.classList.remove(
                                "open"
                            );

                        }
                    );

                }
            );

    }


    /* =====================================================
       ERROR UI
    ===================================================== */

    function showUploadError(
        message
    ) {

        if (!uploadError) {

            alert(message);

            return;

        }


        uploadError.textContent =
            message;


        setSectionVisible(
            uploadError,
            true
        );

    }


    function hideUploadError() {

        if (!uploadError) {
            return;
        }


        uploadError.textContent =
            "";


        setSectionVisible(
            uploadError,
            false
        );

    }


    function showReceiveError(
        message
    ) {

        if (!receiveError) {

            alert(message);

            return;

        }


        receiveError.textContent =
            message;


        receiveError.classList.add(
            "show"
        );


        if (
            "hidden" in receiveError
        ) {

            receiveError.hidden =
                false;

        }

    }


    function hideReceiveError() {

        if (!receiveError) {
            return;
        }


        receiveError.textContent =
            "";


        receiveError.classList.remove(
            "show"
        );


        if (
            "hidden" in receiveError
        ) {

            receiveError.hidden =
                true;

        }

    }


    /* =====================================================
       TOAST
    ===================================================== */

    function showToast(
        type,
        message
    ) {

        if (
            !toast ||
            !toastMessage
        ) {

            return;

        }


        clearTimeout(
            toastTimer
        );


        if (toastIcon) {

            toastIcon.textContent =
                type === "error"
                    ? "!"
                    : "✓";

        }


        toastMessage.textContent =
            message;


        toast.classList.add(
            "show"
        );


        toastTimer =
            setTimeout(
                () => {

                    toast.classList.remove(
                        "show"
                    );

                },
                2500
            );

    }


    /* =====================================================
       FRIENDLY ERROR
    ===================================================== */

    function friendlyError(
        error
    ) {

        const message =
            error?.message ||
            "Something went wrong.";


        if (
            message.includes(
                "Failed to fetch"
            )
        ) {

            return (
                "Cannot connect to server. " +
                "Make sure npm start is running."
            );

        }


        if (
            message.includes(
                "413"
            )
        ) {

            return (
                "File is too large. Maximum size is 500 MB."
            );

        }


        return message;

    }


    /* =====================================================
       FILE NAME
    ===================================================== */

    function getFileName(
        file
    ) {

        return (
            file?.name ||
            file?.originalName ||
            file?.originalname ||
            file?.filename ||
            "Shared file"
        );

    }


    /* =====================================================
       FILE SIZE
    ===================================================== */

    function formatFileSize(
        bytes
    ) {

        const value =
            Number(bytes);


        if (
            !Number.isFinite(value) ||
            value <= 0
        ) {

            return "0 B";

        }


        const units = [
            "B",
            "KB",
            "MB",
            "GB",
            "TB"
        ];


        const index =
            Math.min(
                Math.floor(
                    Math.log(value) /
                    Math.log(1024)
                ),
                units.length - 1
            );


        const size =
            value /
            Math.pow(
                1024,
                index
            );


        return (
            `${size.toFixed(
                index === 0
                    ? 0
                    : 2
            )} ${units[index]}`
        );

    }


    /* =====================================================
       FILE ICON
    ===================================================== */

    function getFileIcon(
        fileName
    ) {

        const extension =
            String(
                fileName || ""
            )
                .split(".")
                .pop()
                .toLowerCase();


        const icons = {

            jpg: "IMG",
            jpeg: "IMG",
            png: "IMG",
            gif: "IMG",
            webp: "IMG",
            svg: "IMG",

            mp4: "VID",
            mov: "VID",
            avi: "VID",
            mkv: "VID",
            webm: "VID",

            mp3: "AUD",
            wav: "AUD",
            flac: "AUD",
            m4a: "AUD",

            pdf: "PDF",

            doc: "DOC",
            docx: "DOC",

            xls: "XLS",
            xlsx: "XLS",

            ppt: "PPT",
            pptx: "PPT",

            zip: "ZIP",
            rar: "ZIP",
            "7z": "ZIP",

            txt: "TXT",
            csv: "CSV",

            js: "JS",
            html: "WEB",
            css: "CSS",
            json: "{}",

            py: "PY",
            java: "JAVA",
            c: "C",
            cpp: "C++"

        };


        return (
            icons[extension] ||
            "FILE"
        );

    }


    /* =====================================================
       STARTUP DEBUG
    ===================================================== */

    console.log(
        "Frontend elements:",
        {
            fileInput,
            browseBtn,
            dropZone,
            selectedFilesSection,
            fileList,
            uploadBtn,
            shareResult,
            codeInput,
            receiveBtn
        }
    );


});