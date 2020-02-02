const path = require('path')
const fs = require('fs-extra')
const shelljs = require('shelljs')

shelljs.config.verbose = true

const prjFolder = path.join(__dirname, '_projects')
fs.ensureDirSync(prjFolder)

const config = fs.readJSONSync(path.join(__dirname, 'projects.json'))
const allProjects = config.automatic.concat(Object.keys(config.custom))

shelljs.cd(prjFolder)

const result = {}
const skipExt = []
const shouldSkipExt = [
    'gradle',
    'pro',
    'xml',
    'png',
    'jar',
    'properties',
    'bat',
    'lock',
    'json',
    'pbxproj',
    'pch',
    'modulemap',
    'xcconfig',
    'plist',
    'xib',
    'storyboard',
    'xcworkspacedata',
    'xcscheme',
    'podspec'
]
const shouldSkipFolder = [
    'node_modules'
]

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
    'sass': 'sass',
    'scss': 'scss',
    'md': 'markdown',
    'markdown': 'markdown',
    'sh': 'shell',
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
                skipExt.push(ext)
            }
        } else {
            result[lang] = result[lang] || 0
            result[lang] += fileStat.size
        }
    }
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
        console.log('git pull')
        shelljs.cd(name)
        shelljs.exec('git pull')
        shelljs.cd('..')
    } else {
        console.log('git clone')
        shelljs.exec('git clone --depth 1 https://github.com/' + project + '.git')
    }

    console.log('analysising ...')
    analysis(path.join(prjFolder, name))

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
    table.push({ Language: key, Percentage: percent + '%' })
})
console.table(table)

console.log('skip', skipExt)

