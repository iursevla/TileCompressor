let shelljs = require("shelljs");
let fs = require('fs');
let cluster = require('cluster'); // Paralellize png compression
let numCPUs = require('os').cpus().length;

let inputFolder;
let outputFolder;
let pngquantOptions;

if (cluster.isMaster) {
    let userArgs = process.argv.slice(2, process.argv.length); console.log(userArgs);
    if (userArgs.length > 0) {
        if (userArgs[0] === '--cpus') {
            let customNumCPUs = parseInt(userArgs[1]);
            if (isNaN(customNumCPUs))
                throw new Error('Number of cpus given is not a number.');
            numCPUs = Math.min(numCPUs, customNumCPUs) > 0 ? Math.min(numCPUs, customNumCPUs) : numCPUs;

            inputFolder = './' + userArgs[2] + '/';
            outputFolder = './' + userArgs[3] + '/';
            if (userArgs.length > 4) {
                pngquantOptions = userArgs.slice(5, userArgs.length);
                pngquantOptions = pngquantOptions.join(' ');
            }
        }
        else {
            inputFolder = './' + userArgs[0] + '/';
            outputFolder = './' + userArgs[1] + '/';
            if (userArgs.length > 2) {
                pngquantOptions += userArgs.slice(3, userArgs.length);
                pngquantOptions = pngquantOptions.join(' ');
            }
        }
    }
    createOutputFolders();
    assignTilesToCPUs();
    for (let i = 0; i < numCPUs; i++)
        cluster.fork({ inputFolder, outputFolder, pngquantOptions });
}
else {
    require('./worker.js');
}

//Create output folders with same as input folders. 
//Later workers only create files because all folder are already created.
function createOutputFolders() {
    if (!fs.existsSync(outputFolder)) //Create output folder if not exists
        fs.mkdirSync(outputFolder);
    let zoomLevels = fs.readdirSync(inputFolder);
    for (const zoomLevel of zoomLevels) {
        if (!fs.existsSync(outputFolder + zoomLevel)) //Create this zoom folder inside output folder 
            fs.mkdirSync(outputFolder + zoomLevel);
        let numbers = fs.readdirSync(inputFolder + zoomLevel);
        for (const number of numbers)
            if (!fs.existsSync(outputFolder + zoomLevel + "/" + number))//Create folder number inside zoom level folder
                fs.mkdirSync(outputFolder + zoomLevel + "/" + number);
    }
}

//Assign n/numCPUs tiles for each CPU core. 
//Then write those tile paths to a .txt file which each core will use.
function assignTilesToCPUs() {
    let tileFiles = [];
    let zoomLevels = fs.readdirSync(inputFolder);
    for (const zoomLevel of zoomLevels) {
        let numbers = fs.readdirSync(inputFolder + zoomLevel);
        for (const number of numbers) {
            let pngs = fs.readdirSync(inputFolder + zoomLevel + "/" + number);
            for (const png of pngs)
                tileFiles.push(inputFolder + zoomLevel + "/" + number + "/" + png);
        }
    }

    let end = tileFiles.length / numCPUs;
    for (let i = 0; i < numCPUs; i++) {
        let eachCoreTiles = tileFiles.slice(i * end, end * (i + 1));
        fs.writeFileSync('core_' + (i + 1) + ".txt", JSON.stringify(eachCoreTiles));//Write tiles to core_i.txt
    }
}