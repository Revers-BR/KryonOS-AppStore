const fs = require('fs');
const path = require('path');

// Repository Configuration
const REPO_OWNER = 'Revers-BR';
const REPO_NAME = 'KryonOS-AppStore';
const BRANCH = 'main';
const BASE_RAW_URL = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/refs/heads/${BRANCH}`;

// Versão padrão da API para garantir padronização
const CURRENT_API_VERSION = 2;

const categoriesDir = path.join(__dirname, '..', 'categories');
const rootIndexPath = path.join(__dirname, '..', 'index.json');

const rootRegistry = { categories: {} };

function formatCategoryName(folderName) {
    return folderName
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Retorna o arquivo principal correto (main.js ou main.lua)
function getMainFileName(appPath) {
    if (fs.existsSync(path.join(appPath, 'main.luac'))) {
        return 'main.luac';
    }
    if (fs.existsSync(path.join(appPath, 'main.lua'))) {
        return 'main.lua';
    }
    if (fs.existsSync(path.join(appPath, 'main.wren'))) {
        return 'main.wren';
    }
    if (fs.existsSync(path.join(appPath, 'main.js'))) {
        return 'main.js';
    }
    return null;
}

if (fs.existsSync(categoriesDir)) {
    const categories = fs.readdirSync(categoriesDir).filter(f => fs.statSync(path.join(categoriesDir, f)).isDirectory());

    for (const category of categories) {
        const categoryPath = path.join(categoriesDir, category);
        const categoryApps = { apps: {} };
        
        const apps = fs.readdirSync(categoryPath).filter(f => fs.statSync(path.join(categoryPath, f)).isDirectory());

        for (const appDir of apps) {
            const appPath = path.join(categoryPath, appDir);
            const appJsonPath = path.join(appPath, 'app.json');

            if (fs.existsSync(appJsonPath)) {
                try {
                    // Detecta se o ponto de entrada é main.js ou main.lua
                    const mainFile = getMainFileName(appPath);

                    if (!mainFile) {
console.warn(`[AVISO] Nenhum main.luac, main.lua, main.wren ou main.js encontrado em: ${category}/${appDir}`);                        continue;
                    }

                    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
                    const appName = appJson.name; 

                    // Build the raw GitHub URLs
                    const metaRawUrl = `${BASE_RAW_URL}/categories/${category}/${appDir}/app.json`;
                    const appRawUrl = `${BASE_RAW_URL}/categories/${category}/${appDir}/${mainFile}`;

                    let fileUpdated = false;

                    // --- Update the metaUrl inside app.json if needed ---
                    if (appJson.metaUrl !== metaRawUrl) {
                        appJson.metaUrl = metaRawUrl;
                        fileUpdated = true;
                        console.log(`Updated metaUrl inside ${category}/${appDir}/app.json`);
                    }

                    // --- Update the api version inside app.json if needed ---
                    if (appJson.api !== CURRENT_API_VERSION) {
                        appJson.api = CURRENT_API_VERSION;
                        fileUpdated = true;
                        console.log(`Updated api version inside ${category}/${appDir}/app.json`);
                    }

                    // Salva o arquivo apenas se houver alterações
                    if (fileUpdated) {
                        fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
                    }
                    // ----------------------------------------------------

                    categoryApps.apps[appName] = {
                        meta: metaRawUrl,
                        app: appRawUrl
                    };
                } catch (error) {
                    console.error(`Error parsing ${appJsonPath}:`, error);
                }
            }
        }

        fs.writeFileSync(path.join(categoryPath, 'index.json'), JSON.stringify(categoryApps, null, 2));
        const categoryTitle = formatCategoryName(category);
        rootRegistry.categories[categoryTitle] = `${BASE_RAW_URL}/categories/${category}/index.json`;
    }
}

fs.writeFileSync(rootIndexPath, JSON.stringify(rootRegistry, null, 2));
console.log('KryonOS App Store registry and app.json files successfully updated.');