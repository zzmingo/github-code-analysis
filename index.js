const path = require('path')
const fs = require('fs-extra')
const shelljs = require('shelljs')
const skipConfig = require('./skips')

shelljs.config.verbose = false

console.log(process.argv)

const prjFolder = path.join(__dirname, '_projects')
fs.ensureDirSync(prjFolder)

const config = fs.readJSONSync(path.join(__dirname, 'projects.json'))
const allProjects = config.automatic.concat(Object.keys(config.custom))

shelljs.cd(prjFolder)

const result = {}
const resultLines = {}
const skipExt = []
const shouldSkipExt = skipConfig.extensions
const shouldSkipFolder = skipConfig.directories

const langMap = {
    'swift': 'Swift',
    'java': 'Java',
    'kt': 'Kotlin',
    'h': 'ObjectiveC',
    'm': 'ObjectiveC',
    'mm': 'ObjectiveC',
    'js': 'JavaScript',
    'jsx': 'JavaScript',
    'ts': 'TypeScript',
    'tsx': 'TypeScript',
    'html': 'html',
    'css': 'css',
    'less': 'less',
    'sass': 'scss',
    'scss': 'scss',
    'md': 'markdown',
    'markdown': 'markdown',
    'sh': 'shell',
    'ejs': 'html',
    'vue': 'vue',
}

function fileLines(file) {
    let fileBuffer =  fs.readFileSync(file);
    let num = fileBuffer.toString().split('\n').length;
    return num
}

function analysis(file) {
    const fileName = path.basename(file)
    if (fileName.indexOf('.') === 0) {
        return
    }
    if (!fs.existsSync(file)) {
        console.log('warn: not exists ' + file)
        return
    }
    const fileStat = fs.statSync(file)
    if (fileStat.isDirectory()) {
        if (shouldSkipFolder.indexOf(fileName) !== -1) {
            return
        }
        const files = fs.readdirSync(file)
        files.forEach(subFile => analysis(path.join(file, subFile)))
    } else {
        let ext = path.extname(file)
        if (!ext) {
            return
        }
        ext = ext.substr(1)
        const lang = langMap[ext]
        if (!lang) {
            if (shouldSkipExt.indexOf(ext) === -1 && skipExt.indexOf(ext) === -1) {
                let skips = skipConfig.ends.some(item => file.endsWith(item))
                if (skips.length <= 0) {
                    skipExt.push(ext)
                }
            }
        } else {
            if (fileName.endsWith('.min.js')) {
                return
            }
            result[lang] = result[lang] || 0
            result[lang] += fileStat.size
            resultLines[lang] = resultLines[lang] || 0
            resultLines[lang] += fileLines(file)
            if (fileStat.size > 400 * 1024) {
                console.log('warn: file too large: ' + file)
            }
        }
    }
}

function customAalysis(prjPath) {

}

allProjects.forEach(project => {
    let name = project
    if (project.indexOf('/') == -1) {
        project = config.user + '/' + project
    } else {
        name = project.split('/')[1]
    }

    console.log('#### ' +  project)
    if (fs.existsSync(path.join(prjFolder, name))) {
        if (process.argv[2] == "--quick") {
            console.log('skip git pull')
        } else {
            console.log('git pull')
            shelljs.cd(name)
            shelljs.exec('git pull')
            shelljs.cd('..')
        }
    } else {
        console.log('git clone')
        shelljs.exec('git clone --depth 1 https://github.com/' + project + '.git')
    }

    console.log('analysising ...')

    if (config.custom[project]) {
        customAalysis(path.join(prjFolder, name))
    } else {
        analysis(path.join(prjFolder, name))
    }

    console.log('#### done')
    console.log()
})

const keys = Object.keys(result)
let total = 0
keys.forEach(key => {
    total += result[key]
})


let table = []
keys.forEach(key => {
    let percent = (Math.ceil(result[key] / total * 1000) / 10)
    if (percent < 1) {
        return
    }
    table.push({ Language: key, Lines: resultLines[key] || 0, Percentage: percent + '%' })
})
table.sort((a, b) => {
    return b.Lines - a.Lines
})
console.table(table)

console.log('skip', skipExt)

