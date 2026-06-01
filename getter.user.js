// ==UserScript==
// @name         Danbooru 高清原图批量下载器 (万能高对比原生版)
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  直接在 Danbooru 网页上批量下载高清原图，自带精美高对比内联样式，支持中文/日文/括号等任意 Tag 万能检索
// @author       我思故汝永存
// @match        https://*.donmai.us/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=donmai.us
// @grant        GM_xmlhttpRequest
// @connect      *
// @require      https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js
// ==/UserScript==

(function() {
    'use strict';

    // ==========================================
    // 1. 注入原生高对比度 CSS 样式 (解决白屏/看不清问题)
    // ==========================================
    const styleElement = document.createElement('style');
    styleElement.innerHTML = `
        /* 悬浮启动按钮 */
        .db-float-btn {
            position: fixed;
            bottom: 24px;
            right: 24px;
            background-color: #e11d48 !important;
            color: #ffffff !important;
            font-weight: bold;
            padding: 12px 20px;
            border-radius: 9999px;
            box-shadow: 0 4px 12px rgba(225, 29, 72, 0.4);
            cursor: pointer;
            border: none;
            z-index: 99999;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-size: 13px;
            transition: transform 0.2s, background-color 0.2s;
            font-family: system-ui, -apple-system, sans-serif;
        }
        .db-float-btn:hover {
            transform: scale(1.05);
            background-color: #be123c !important;
        }

        /* 模态框背景遮罩 */
        .db-modal-overlay {
            position: fixed;
            inset: 0;
            background-color: rgba(0, 0, 0, 0.65);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 16px;
            z-index: 100000;
        }
        .db-modal-overlay.hidden {
            display: none !important;
        }

        /* 模态框主体内容区 (锁定白色背景) */
        .db-modal-content {
            background-color: #ffffff !important;
            color: #1e293b !important;
            border-radius: 16px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
            width: min(1800px, 96vw);
            max-width: 1800px;
            height: 90vh;
            max-height: 95vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            border: 1px solid #cbd5e1;
            font-family: system-ui, -apple-system, sans-serif;
        }

        /* 模态框头部 */
        .db-header {
            background-color: #0f172a !important;
            color: #ffffff !important;
            padding: 14px 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #1e293b;
        }
        .db-header-title {
            font-weight: bold;
            font-size: 16px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .db-header-logo {
            color: #f43f5e !important;
            font-family: monospace;
            font-weight: 900;
        }
        .db-close-btn {
            background: none;
            border: none;
            color: #94a3b8;
            font-size: 24px;
            cursor: pointer;
            font-weight: bold;
            transition: color 0.15s;
        }
        .db-close-btn:hover {
            color: #ffffff;
        }

        /* 主体布局 */
        .db-body {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            padding: 0;
            height: 100%;
            background-color: #ffffff !important;
        }

        @media (min-width: 900px) {
            .db-body {
                display: grid;
                grid-template-columns: 260px minmax(0, 1fr);
                gap: 0;
            }
        }

        /* 工具栏 */
        .db-toolbar {
            flex-shrink: 0;
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px 20px;
            border-bottom: 1px solid #e2e8f0;
            background: #fafafa;
        }

        /* 全屏图库容器 */
        .db-gallery-fullpage {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            background: #ffffff;
        }

        /* 左侧面板 */
        .db-sidebar {
            display: flex;
            flex-direction: column;
            gap: 16px;
            padding: 16px;
            border-right: 1px solid #e2e8f0;
            background: #fafafa;
            overflow-y: auto;
        }

        /* 右侧主面板 */
        .db-main {
            display: flex;
            flex-direction: column;
            min-width: 0;
            overflow: hidden;
        }

        /* 工具栏样式 */
        .db-toolbar-btn {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 8px 12px;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            background: #ffffff;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.15s;
        }
        .db-toolbar-btn:hover {
            background: #f1f5f9;
            border-color: #cbd5e1;
        }

        .db-box {
            display: block;
            font-size: 11px;
            font-weight: bold;
            color: #64748b !important;
            margin-bottom: 6px;
            text-transform: uppercase;
        }

        /* 自定义输入框 */
        .db-input {
            width: 100%;
            box-sizing: border-box;
            background-color: #ffffff !important;
            color: #0f172a !important;
            border: 1px solid #cbd5e1 !important;
            border-radius: 6px;
            padding: 8px 12px;
            font-size: 12px;
            font-family: monospace;
            outline: none;
        }
        .db-input:focus {
            border-color: #e11d48 !important;
            box-shadow: 0 0 0 2px rgba(225, 29, 72, 0.15);
        }

        /* 联想搜索下拉框 */
        .db-suggestions {
            position: absolute;
            left: 0;
            right: 0;
            top: 100%;
            background-color: #ffffff !important;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            z-index: 100010;
            max-height: 200px;
            overflow-y: auto;
        }
        .db-suggestion-item {
            padding: 8px 12px;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #f1f5f9;
            transition: background-color 0.15s;
        }
        .db-suggestion-item:hover {
            background-color: #fff1f2 !important;
        }
        .db-tag-name {
            color: #be123c !important;
            font-family: monospace;
            font-weight: bold;
            font-size: 12px;
        }
        .db-tag-count {
            font-size: 10px;
            color: #64748b;
            background-color: #f1f5f9;
            padding: 2px 6px;
            border-radius: 10px;
        }

        /* 右侧面板 */
        .db-main {
            display: flex;
            flex-direction: column;
            min-height: 0;
        }

        /* 按钮通用样式 */
        .db-btn {
            cursor: pointer;
            border: none;
            border-radius: 8px;
            padding: 8px 16px;
            font-weight: bold;
            font-size: 12px;
            text-align: center;
            transition: background-color 0.15s, opacity 0.15s;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
        }
        .db-btn:disabled {
            background-color: #cbd5e1 !important;
            color: #94a3b8 !important;
            cursor: not-allowed;
            opacity: 0.8;
        }

        /* 彩色按钮定制 */
        .db-btn-rose {
            background-color: #e11d48 !important;
            color: #ffffff !important;
        }
        .db-btn-rose:hover:not(:disabled) { background-color: #be123c !important; }

        .db-btn-indigo {
            background-color: #4f46e5 !important;
            color: #ffffff !important;
        }
        .db-btn-indigo:hover:not(:disabled) { background-color: #4338ca !important; }

        .db-btn-emerald {
            background-color: #059669 !important;
            color: #ffffff !important;
        }
        .db-btn-emerald:hover:not(:disabled) { background-color: #047857 !important; }

        .db-btn-outline {
            background-color: #f1f5f9 !important;
            color: #475569 !important;
            border: 1px solid #cbd5e1 !important;
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 11px;
        }
        .db-btn-outline:hover:not(:disabled) { background-color: #e2e8f0 !important; }

        /* 画廊排版 */
        .db-gallery-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #f1f5f9;
            padding-bottom: 12px;
            margin-bottom: 16px;
        }
        .db-gallery-title {
            font-weight: bold;
            font-size: 14px;
            color: #0f172a !important;
            margin: 0;
        }
        .db-gallery-sub {
            font-size: 11px;
            color: #64748b;
            margin: 2px 0 0 0;
        }

        /* 下载选项控制组 */
        .db-download-actions {
            display: flex;
            gap: 10px;
            margin-bottom: 16px;
        }
        .db-download-actions .db-btn {
            flex: 1;
            padding: 12px 16px;
            font-size: 13px;
        }

        /* 进度展示面板 */
        .db-progress-box {
            background-color: #f1f5f9 !important;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 16px;
        }
        .db-progress-text {
            font-size: 11px;
            font-weight: bold;
            color: #475569 !important;
            margin: 0 0 6px 0;
        }
        .db-progress-track {
            background-color: #e2e8f0;
            height: 6px;
            border-radius: 3px;
            overflow: hidden;
        }
        .db-progress-bar {
            background-color: #4f46e5;
            height: 100%;
            border-radius: 3px;
            transition: width 0.25s ease;
        }

        /* 画廊网格 */
        .db-grid {
            display: grid;
            grid-template-columns: repeat(5, minmax(180px, 1fr));
            gap: 12px;
            overflow-y: auto;
            flex: 1;
            padding-right: 8px;
            align-content: start;
        }

        /* 图库包装器 - 独立滚动区域 */
        .db-grid-wrapper {
            flex: 1;
            min-height: 0;
            overflow-y: auto;
            overflow-x: hidden;
        }

        /* 作品卡片 */
        .db-card {
            background-color: #ffffff !important;
            border: 1px solid #e2e8f0 !important;
            border-radius: 8px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            transition: border-color 0.15s, box-shadow 0.15s;
        }
        .db-card:hover {
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
        }
        .db-card-img-wrap {
            position: relative;
            width: 100%;
            height: 200px;
            background: #f8fafc;
            overflow: hidden;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        .db-card-img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            display: block;
        }
        .db-card-badge-id {
            position: absolute;
            top: 6px;
            left: 6px;
            background-color: rgba(15, 23, 42, 0.7);
            color: #ffffff !important;
            font-size: 9px;
            padding: 2px 4px;
            border-radius: 4px;
            font-family: monospace;
        }
        .db-card-badges {
            position: absolute;
            top: 6px;
            right: 6px;
            display: flex;
            gap: 2px;
        }
        .db-badge {
            font-size: 8px;
            font-weight: bold;
            color: #ffffff !important;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: monospace;
        }
        .db-badge-rating { background-color: #3b82f6; }
        .db-badge-ext { background-color: #ef4444; }

        .db-card-body {
            padding: 10px;
            display: flex;
            flex-direction: column;
            flex-grow: 1;
            justify-content: space-between;
        }
        .db-card-meta {
            font-size: 10px;
            color: #64748b !important;
            margin-bottom: 8px;
        }
        .db-card-meta-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 2px;
        }
        .db-card-action {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-top: 1px solid #f1f5f9;
            padding-top: 8px;
        }
        .db-checkbox-label {
            display: flex;
            align-items: center;
            gap: 4px;
            cursor: pointer;
            font-size: 10px;
            color: #475569 !important;
        }
        .db-single-btn {
            background: none;
            border: none;
            color: #e11d48;
            cursor: pointer;
            padding: 2px;
            border-radius: 4px;
            display: inline-flex;
        }
        .db-single-btn:hover {
            background-color: #fff1f2;
        }

        /* 占位提示 */
        .db-placeholder {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 48px;
            color: #94a3b8 !important;
            flex: 1;
        }

        /* 页脚专属样式 */
        .db-footer {
            background-color: #f8fafc !important;
            border-top: 1px solid #cbd5e1;
            padding: 10px 24px;
            text-align: right !important;
            font-size: 11px !important;
            color: #64748b !important;
            user-select: none !important;
        }
        .db-footer a {
            color: #e11d48 !important;
            text-decoration: none !important;
            font-weight: bold !important;
        }
        .db-footer a:hover {
            text-decoration: underline !important;
            color: #be123c !important;
        }

        /* 分页控件 */
        .db-pagination {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 8px;
            padding: 12px;
            border-top: 1px solid #f1f5f9;
            background-color: #ffffff;
        }
        .db-page-btn {
            cursor: pointer;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 6px 12px;
            font-size: 12px;
            color: #475569;
            background-color: #ffffff;
            transition: all 0.15s;
        }
        .db-page-btn:hover:not(:disabled) {
            background-color: #f1f5f9;
            border-color: #cbd5e1;
        }
        .db-page-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .db-page-btn.active {
            background-color: #e11d48;
            color: #ffffff;
            border-color: #e11d48;
        }
        .db-page-info {
            font-size: 12px;
            color: #64748b;
            min-width: 100px;
            text-align: center;
        }
    `;
    document.head.appendChild(styleElement);

    let fetchedPosts = [];
    const PAGE_SIZE = 30;
    let currentPage = 1;

    // ==========================================
    // 2. 写入 DOM 结构
    // ==========================================
    const container = document.createElement('div');
    container.id = 'danbooru-downloader-root';
    document.body.appendChild(container);

    container.innerHTML = `
        <!-- 悬浮启动按钮 -->
        <button id="danbooru-float-btn" class="db-float-btn">
            <svg style="width:14px; height:14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            <span>批量原图下载</span>
        </button>

        <!-- 主模态框 -->
        <div id="danbooru-downloader-modal" class="db-modal-overlay hidden">
            <div class="db-modal-content">

                <!-- 头部 -->
                <div class="db-header">
                    <div class="db-header-title">
                        <span class="db-header-logo">Danbooru</span>
                        <span>万能高清原图批量下载</span>
                    </div>
                    <button id="danbooru-close-btn" class="db-close-btn">&times;</button>
                </div>

                <!-- 身体 -->
                <div class="db-body">

                    <!-- 左侧控制栏 -->
                    <div class="db-sidebar">
                        <div class="db-box">
                            <span class="db-label">检索 Tag</span>
                            <input type="text" id="danbooru-tag-input" class="db-input" placeholder="例如: mika_pikazo" autocomplete="off">
                            <button id="danbooru-fetch-btn" class="db-btn db-btn-rose" style="width: 100%; margin-top: 12px;">检索作品列表</button>
                            <p id="danbooru-fetch-progress" style="text-align: center; font-size: 10px; margin: 8px 0 0 0; color: #64748b;" class="hidden"></p>
                        </div>

                        <div class="db-box">
                            <span class="db-label">下载延迟</span>
                            <div style="display:flex; align-items:center; gap:6px;">
                                <input type="number" id="danbooru-delay-input" value="1000" min="200" class="db-input" style="width: 80px;">
                                <span style="font-size:11px; color:#64748b;">毫秒</span>
                            </div>
                        </div>

                        <div class="db-box">
                            <span class="db-label">批量操作</span>
                            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                                <button id="danbooru-select-all" class="db-btn db-btn-outline" style="flex:1; min-width: 60px;">全选</button>
                                <button id="danbooru-select-none" class="db-btn db-btn-outline" style="flex:1; min-width: 60px;">清空</button>
                            </div>
                            <p id="danbooru-selected-count" style="font-size: 11px; color: #64748b; margin: 8px 0 0 0; text-align: center;">已选中: 0 / 0</p>
                        </div>

                        <div class="db-box">
                            <span class="db-label">下载方式</span>
                            <button id="danbooru-download-seq" class="db-btn db-btn-indigo" style="width: 100%; margin-bottom: 8px;">直接下载</button>
                            <button id="danbooru-download-zip" class="db-btn db-btn-emerald" style="width: 100%;">打包 ZIP</button>
                        </div>
                    </div>

                    <!-- 右侧图库区域 -->
                    <div class="db-main">
                        <!-- 全屏图库 -->
                        <div id="danbooru-gallery-container" class="db-gallery-fullpage hidden">
                            <div class="db-grid-wrapper">
                                <div id="danbooru-gallery" class="db-grid"></div>
                            </div>
                            <!-- 分页控件 -->
                            <div id="danbooru-pagination" class="db-pagination hidden" style="flex-shrink: 0; padding: 12px; display: flex; justify-content: center; gap: 8px; border-top: 1px solid #e2e8f0; background: #fafafa;">
                                <button id="danbooru-page-prev" class="db-page-btn">上一页</button>
                                <span id="danbooru-page-info" class="db-page-info">第 1 / 1 页</span>
                                <button id="danbooru-page-next" class="db-page-btn">下一页</button>
                            </div>
                        </div>

                        <!-- 占位图 -->
                        <div id="danbooru-placeholder" class="db-placeholder" style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                            <svg style="width:48px; height:48px; margin-bottom:8px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                            <p style="font-size:12px; margin:0; text-align:center;">输入 Tag 并点击"检索作品列表"<br>开始浏览和下载</p>
                        </div>
                    </div>

                </div>

                <!-- 页脚 -->
                <div class="db-footer">
                    power by Gemini, Made with ❤️ by <a href="https://space.bilibili.com/651921014?spm_id_from=333.1007.0.0" target="_blank" title="访问我的 Bilibili 空间">我思故汝永存</a>
                </div>

            </div>
        </div>
    `;

    // 绑定 DOM 元素
    const floatBtn = document.getElementById('danbooru-float-btn');
    const modal = document.getElementById('danbooru-downloader-modal');
    const closeBtn = document.getElementById('danbooru-close-btn');
    const tagInput = document.getElementById('danbooru-tag-input');
    const suggestionsBox = document.getElementById('danbooru-suggestions');
    const fetchBtn = document.getElementById('danbooru-fetch-btn');
    const fetchProgress = document.getElementById('danbooru-fetch-progress');
    const galleryContainer = document.getElementById('danbooru-gallery-container');
    const placeholder = document.getElementById('danbooru-placeholder');
    const galleryEl = document.getElementById('danbooru-gallery');
    const selectedCountEl = document.getElementById('danbooru-selected-count');
    const paginationEl = document.getElementById('danbooru-pagination');
    const pagePrevBtn = document.getElementById('danbooru-page-prev');
    const pageNextBtn = document.getElementById('danbooru-page-next');
    const pageInfoEl = document.getElementById('danbooru-page-info');

    // ==========================================
    // 3. 模态框开启与高精度自动捕获
    // ==========================================
    floatBtn.addEventListener('click', () => {
        modal.classList.remove('hidden');
        if (!tagInput.value.trim()) {
            const currentTag = getTagFromPage();
            if (currentTag) {
                tagInput.value = currentTag;
                console.log("[Danbooru Downloader] 自动捕获到当前页面标签: " + currentTag);
            }
        }
    });

    closeBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    // 智能提取：不仅支持画师，也支持各种主流搜索页面和单图页面的原生标签
    function getTagFromPage() {
        // 1. 优先抓取侧边栏里的画师标签 (category-1)
        const sidebarArtistEl = document.querySelector('.tag-type-artist .search-tag, .tag-type-1 .search-tag, .category-1 .search-tag');
        if (sidebarArtistEl) {
            return sidebarArtistEl.textContent.trim().toLowerCase().replace(/ /g, '_');
        }

        // 2. 尝试从单图详情页的主标题链接捕获第一个标签
        const h1Artist = document.querySelector('h1 a[href*="tags="], #post-sections a[href*="tags="]');
        if (h1Artist) {
            try {
                const hrefUrl = new URL(h1Artist.href, window.location.origin);
                const queryTags = hrefUrl.searchParams.get('tags') || '';
                if (queryTags) {
                    return queryTags.replace(/^artist:/, '').split(' ')[0].trim().toLowerCase();
                }
            } catch(e){}
        }

        // 3. 尝试直接获取 Danbooru 页面自身自带的搜索输入框 (#tags)
        const officialSearchInput = document.getElementById('tags');
        if (officialSearchInput && officialSearchInput.value) {
            let val = officialSearchInput.value.trim().toLowerCase();
            val = val.replace(/^artist:/, '');
            return val.split(' ')[0];
        }

        // 4. 尝试解析当前浏览器的 URL query 参数
        const params = new URLSearchParams(window.location.search);
        let urlTags = params.get('tags') || '';
        if (urlTags) {
            urlTags = urlTags.trim().toLowerCase();
            const match = urlTags.match(/artist:([^\s+]+)/);
            if (match) return match[1];
            return urlTags.split(' ')[0];
        }

        return '';
    }

    // 防抖
    function debounce(func, delay) {
        let timer;
        return function(...args) {
            clearTimeout(timer);
            timer = setTimeout(() => func.apply(this, args), delay);
        };
    }

    // ==========================================
    // 4. 万能检索联想输入
    // ==========================================
    tagInput.addEventListener('input', debounce(async (e) => {
        let query = e.target.value.trim().toLowerCase();
        query = query.replace(/^artist:/, '').replace(/ /g, '_');

        if (query.length < 2) {
            suggestionsBox.classList.add('hidden');
            return;
        }

        // category=1 依然优先搜索画师，便于快速过滤
        const url = `/tags.json?search[name_matches]=*${encodeURIComponent(query)}*&search[category]=1&limit=10`;

        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error();
            const tags = await res.json();

            if (tags.length === 0) {
                suggestionsBox.innerHTML = '<div style="padding: 10px; font-size:11px; text-align:center; color:#94a3b8;">无匹配画师，检索时将直接使用手输标签</div>';
            } else {
                suggestionsBox.innerHTML = tags.map(tag => `
                    <div class="db-suggestion-item" data-name="${tag.name}">
                        <span class="db-tag-name">${tag.name}</span>
                        <span class="db-tag-count">${tag.post_count.toLocaleString()}</span>
                    </div>
                `).join('');

                suggestionsBox.querySelectorAll('.db-suggestion-item').forEach(el => {
                    el.addEventListener('click', () => {
                        tagInput.value = el.getAttribute('data-name');
                        suggestionsBox.classList.add('hidden');
                    });
                });
            }
            suggestionsBox.classList.remove('hidden');
        } catch (err) {
            console.error(err);
        }
    }, 300));

    document.addEventListener('click', (e) => {
        if (!tagInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
            suggestionsBox.classList.add('hidden');
        }
    });

    // ==========================================
    // 5. 拉取万能作品元数据 (带高精度 encodeURIComponent 编码与控制台 Debug)
    // ==========================================
    window.fetchPosts = async function() {
        let rawInput = tagInput.value.trim().toLowerCase();
        if (!rawInput) {
            alert('请先输入或选择一个有效的检索 Tag！');
            return;
        }

        // 强力清洗首尾空格、重复前缀及多余的下划线
        const cleanTag = rawInput.replace(/^artist:/, '').replace(/ /g, '_');

        const limit = 100;
        let lastId = null;
        fetchedPosts = [];
        currentPage = 1;

        fetchBtn.disabled = true;
        fetchBtn.textContent = '读取列表中...';
        fetchProgress.classList.remove('hidden');
        fetchProgress.textContent = '连接官方 API 中...';

        try {
            while (true) {
                // 使用官方最标准的通用搜索模式，并进行完美 URL 编码，避免日文、括号字符直接暴露
                let url = `/posts.json?tags=${encodeURIComponent(cleanTag)}&limit=${limit}`;
                if (lastId) {
                    url += `&page=b${lastId}`;
                }

                // 打印调试日志至浏览器控制台 (Console)
                console.log("[Danbooru Downloader] 正在发起 API 请求: ", window.location.origin + url);
                fetchProgress.textContent = `正检索列表 (已成功获取 ${fetchedPosts.length} 个作品)...`;

                const res = await fetch(url);
                if (res.status === 429) {
                    console.warn("[Danbooru Downloader] 触发官方频率限制 (429)，等待 4 秒后自动重试...");
                    await new Promise(resolve => setTimeout(resolve, 4000));
                    continue;
                }
                if (!res.ok) throw new Error(`HTTP ${res.status}`);

                const posts = await res.json();
                if (posts.length === 0) break;

                fetchedPosts = fetchedPosts.concat(posts);
                lastId = posts[posts.length - 1].id;

                if (posts.length < limit) break;

                // 延迟，安全保护
                await new Promise(resolve => setTimeout(resolve, 800));
            }

            console.log(`[Danbooru Downloader] 列表拉取成功。共计: ${fetchedPosts.length} 篇。数据:`, fetchedPosts);
            fetchProgress.textContent = `检索成功！共拉取 ${fetchedPosts.length} 篇作品数据。`;
            placeholder.classList.add('hidden');
            renderGallery();

        } catch (err) {
            console.error("[Danbooru Downloader] 抓取失败，错误详情:", err);
            fetchProgress.textContent = `检索终止: ${err.message} (请按 F12 查看控制台报错)`;
        } finally {
            fetchBtn.disabled = false;
            fetchBtn.textContent = '检索作品列表';
        }
    };

    fetchBtn.addEventListener('click', window.fetchPosts);

    // ==========================================
    // 6. 渲染网格画廊（支持分页）
    // ==========================================
    function renderGallery() {
        if (fetchedPosts.length === 0) {
            galleryContainer.classList.add('hidden');
            placeholder.classList.remove('hidden');
            paginationEl.classList.add('hidden');
            return;
        }

        galleryContainer.classList.remove('hidden');
        
        const totalPages = Math.ceil(fetchedPosts.length / PAGE_SIZE);
        const startIndex = (currentPage - 1) * PAGE_SIZE;
        const endIndex = startIndex + PAGE_SIZE;
        const currentPagePosts = fetchedPosts.slice(startIndex, endIndex);

        galleryEl.innerHTML = currentPagePosts.map((post) => {
            const originalUrl = post.file_url || post.large_file_url;
            let previewUrl = post.preview_url || post.preview_file_url || post.sample_url || '';
            
            if (previewUrl) {
                if (!previewUrl.startsWith('http')) {
                    if (previewUrl.startsWith('//')) {
                        previewUrl = `https:${previewUrl}`;
                    } else if (previewUrl.startsWith('/')) {
                        previewUrl = `https://${window.location.host}${previewUrl}`;
                    } else {
                        previewUrl = `https://${window.location.host}/${previewUrl}`;
                    }
                }
            }
            
            const sizeText = post.image_width && post.image_height ? `${post.image_width}x${post.image_height}` : '未知';
            const ext = post.file_ext || 'jpg';
            const rating = post.rating ? post.rating.toUpperCase() : 'U';
            const hasOriginal = !!originalUrl;

            console.log(`[Danbooru Downloader] Post ${post.id}: previewUrl=${previewUrl}, hasPreview=${!!previewUrl}`);

            return `
                <div class="db-card" id="tm-card-${post.id}">
                    <div class="db-card-img-wrap">
                        ${previewUrl ? `<img src="${previewUrl}" class="db-card-img" loading="lazy" onerror="console.log('Image load failed:', this.src); this.style.display='none'; this.parentElement.innerHTML='<span style=\\'font-size:10px; color:#cbd5e1;\\'>加载失败</span>';">` : `<span style="font-size:10px; color:#cbd5e1;">暂无预览</span>`}
                        <div class="db-card-badge-id">#${post.id}</div>
                        <div class="db-card-badges">
                            <span class="db-badge db-badge-rating">${rating}</span>
                            <span class="db-badge db-badge-ext">${ext.toUpperCase()}</span>
                        </div>
                    </div>
                    <div class="db-card-body">
                        <div class="db-card-meta">
                            <div class="db-card-meta-row">
                                <span>分辨率:</span>
                                <span style="font-weight:bold; color:#475569; font-family:monospace;">${sizeText}</span>
                            </div>
                        </div>
                        <div class="db-card-action">
                            <label class="db-checkbox-label">
                                <input type="checkbox" class="tm-checkbox" data-id="${post.id}" ${hasOriginal ? 'checked' : 'disabled'}>
                                <span>选择下载</span>
                            </label>
                            ${hasOriginal ? `
                                <button onclick="window.downloadSingle(${post.id})" class="db-single-btn" title="单图无损下载">
                                    <svg style="width:12px; height:12px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        updatePagination(totalPages);
        updateSelectionCount();

        galleryEl.querySelectorAll('.tm-checkbox').forEach(cb => {
            cb.addEventListener('change', updateSelectionCount);
        });
    }

    function updatePagination(totalPages) {
        if (totalPages <= 1) {
            paginationEl.classList.add('hidden');
            return;
        }
        
        paginationEl.classList.remove('hidden');
        pageInfoEl.textContent = `第 ${currentPage} / ${totalPages} 页`;
        pagePrevBtn.disabled = currentPage === 1;
        pageNextBtn.disabled = currentPage === totalPages;
    }

    function goToPage(page) {
        const totalPages = Math.ceil(fetchedPosts.length / PAGE_SIZE);
        if (page < 1 || page > totalPages) return;
        currentPage = page;
        renderGallery();
        galleryEl.scrollTop = 0;
    }

    pagePrevBtn.addEventListener('click', () => goToPage(currentPage - 1));
    pageNextBtn.addEventListener('click', () => goToPage(currentPage + 1));

    function updateSelectionCount() {
        const checked = galleryEl.querySelectorAll('.tm-checkbox:checked').length;
        const total = galleryEl.querySelectorAll('.tm-checkbox').length;
        selectedCountEl.textContent = `已选中无损原画: ${checked} / ${total} 个作品`;
    }

    // 选择控制
    document.getElementById('danbooru-select-all').addEventListener('click', () => toggleAll(true));
    document.getElementById('danbooru-select-none').addEventListener('click', () => toggleAll(false));
    document.getElementById('danbooru-select-invert').addEventListener('click', () => {
        galleryEl.querySelectorAll('.tm-checkbox:not(:disabled)').forEach(cb => cb.checked = !cb.checked);
        updateSelectionCount();
    });

    function toggleAll(state) {
        galleryEl.querySelectorAll('.tm-checkbox:not(:disabled)').forEach(cb => cb.checked = state);
        updateSelectionCount();
    }

    // ==========================================
    // 7. 特权请求：拉取二进制大对象 (Blob) 并走系统代理
    // ==========================================
    function fetchImageBlob(url) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: url,
                responseType: "blob",
                timeout: 30000,
                headers: {
                    "Referer": "https://danbooru.donmai.us/",
                    "User-Agent": navigator.userAgent
                },
                onload: function(res) {
                    if (res.status === 200) {
                        resolve(res.response);
                    } else if (res.status === 429) {
                        setTimeout(() => fetchImageBlob(url).then(resolve).catch(reject), 4000);
                    } else {
                        reject(new Error(`HTTP ${res.status}`));
                    }
                },
                onerror: function(err) {
                    reject(err);
                }
            });
        });
    }

    // 单张高清原图保存
    window.downloadSingle = async function(postId) {
        const post = fetchedPosts.find(p => p.id === postId);
        if (!post) return;

        const url = post.file_url || post.large_file_url;
        const ext = post.file_ext || 'jpg';
        const card = document.getElementById(`tm-card-${postId}`);

        if (card) card.style.borderColor = '#4f46e5';

        try {
            const blob = await fetchImageBlob(url);
            const blobUrl = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = `${postId}.${ext}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
            if (card) card.style.borderColor = '#059669';
        } catch (err) {
            console.error(err);
            if (card) card.style.borderColor = '#ef4444';
            alert(`原画下载失败: ${err.message}`);
        }
    };

    function toggleDownloadUI(isDownloading) {
        document.getElementById('danbooru-download-seq').disabled = isDownloading;
        document.getElementById('danbooru-download-zip').disabled = isDownloading;
        document.getElementById('danbooru-fetch-btn').disabled = isDownloading;
        const panel = document.getElementById('danbooru-download-progress-panel');
        if (isDownloading) panel.classList.remove('hidden');
    }

    // 方案 A: 本地连续直接下载无损原画
    window.downloadSequential = async function() {
        const checkedBoxes = galleryEl.querySelectorAll('.tm-checkbox:checked');
        if (checkedBoxes.length === 0) {
            alert('请先勾选需要下载的作品卡片！');
            return;
        }

        const delay = parseInt(document.getElementById('danbooru-delay-input').value) || 1000;
        if (!confirm(`准备连续拉取保存 ${checkedBoxes.length} 张 100% 原始无损大图 (view original 规格)，请问是否启动？`)) {
            return;
        }

        toggleDownloadUI(true);
        const progressText = document.getElementById('danbooru-download-progress-text');
        const progressBar = document.getElementById('danbooru-download-progress-bar');

        let success = 0;
        let failed = 0;

        for (let i = 0; i < checkedBoxes.length; i++) {
            const cb = checkedBoxes[i];
            const postId = parseInt(cb.getAttribute('data-id'));
            const post = fetchedPosts.find(p => p.id === postId);
            const url = post.file_url || post.large_file_url;
            const ext = post.file_ext || 'jpg';

            progressText.textContent = `正在导出原始大图 (${i + 1}/${checkedBoxes.length}): #${postId}...`;
            progressBar.style.width = `${((i) / checkedBoxes.length) * 100}%`;

            const card = document.getElementById(`tm-card-${postId}`);
            if (card) card.style.borderColor = '#4f46e5';

            try {
                const blob = await fetchImageBlob(url);
                const blobUrl = URL.createObjectURL(blob);

                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = `${postId}.${ext}`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
                if (card) card.style.borderColor = '#059669';
                success++;
            } catch (err) {
                console.error(err);
                if (card) card.style.borderColor = '#ef4444';
                failed++;
            }

            if (i < checkedBoxes.length - 1) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        progressBar.style.width = '100%';
        progressText.textContent = `无损原画连续下载结束！ 成功: ${success} 份， 失败: ${failed} 份。`;
        toggleDownloadUI(false);
    };

    // 方案 B: 打包为 ZIP 格式下载无损原画
    window.downloadZip = async function() {
        const checkedBoxes = galleryEl.querySelectorAll('.tm-checkbox:checked');
        if (checkedBoxes.length === 0) {
            alert('请先勾选需要打包的作品卡片！');
            return;
        }

        if (checkedBoxes.length > 50) {
            if (!confirm(`正在打包 ${checkedBoxes.length} 张高清大图。大图打包非常消耗设备内存，容易导致网页白屏。建议使用“连续直接下载”方案。是否继续？`)) {
                return;
            }
        }

        toggleDownloadUI(true);
        const progressText = document.getElementById('danbooru-download-progress-text');
        const progressBar = document.getElementById('danbooru-download-progress-bar');
        const delay = parseInt(document.getElementById('danbooru-delay-input').value) || 1000;

        const zip = new JSZip();
        let success = 0;
        let failed = 0;

        for (let i = 0; i < checkedBoxes.length; i++) {
            const cb = checkedBoxes[i];
            const postId = parseInt(cb.getAttribute('data-id'));
            const post = fetchedPosts.find(p => p.id === postId);
            const url = post.file_url || post.large_file_url;
            const ext = post.file_ext || 'jpg';

            progressText.textContent = `正在拉取无损大图二进制流并压入包中 (${i + 1}/${checkedBoxes.length}): #${postId}...`;
            progressBar.style.width = `${((i) / checkedBoxes.length) * 80}%`;

            const card = document.getElementById(`tm-card-${postId}`);
            if (card) card.style.borderColor = '#4f46e5';

            try {
                const blob = await fetchImageBlob(url);
                zip.file(`${postId}.${ext}`, blob);
                if (card) card.style.borderColor = '#059669';
                success++;
            } catch (err) {
                console.error(err);
                if (card) card.style.borderColor = '#ef4444';
                failed++;
            }

            if (i < checkedBoxes.length - 1) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        if (success === 0) {
            progressText.textContent = `打包中止，无任何成功的原图。`;
            toggleDownloadUI(false);
            return;
        }

        progressText.textContent = `所有原始大图获取完毕！正在本地进行无损压缩打包中，可能耗时数秒，请勿关闭网页...`;
        progressBar.style.width = '88%';

        try {
            const content = await zip.generateAsync({ type: 'blob' }, (metadata) => {
                progressBar.style.width = `${80 + (metadata.percent * 0.12)}%`;
            });

            const blobUrl = URL.createObjectURL(content);
            const tag = tagInput.value.trim().toLowerCase();
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `danbooru_zip_${tag}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
            progressText.textContent = `无损原画 ZIP 打包并导出完毕！共计打包: ${success} 张原图。`;
        } catch (err) {
            console.error(err);
            progressText.textContent = `ZIP打包生成失败: ${err.message}`;
        } finally {
            toggleDownloadUI(false);
        }
    };

    // 绑定事件
    document.getElementById('danbooru-download-seq').addEventListener('click', window.downloadSequential);
    document.getElementById('danbooru-download-zip').addEventListener('click', window.downloadZip);

})();
