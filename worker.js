let shelljs = require("shelljs");
let cluster = require('cluster');
let fs = require('fs');
let pngquantOptions = "--speed 1 --strip --quality=60-80"

console.log("slave", cluster.worker.id, "has started with pid:", process.pid);
compressPngFiles(process.env.inputFolder, process.env.outputFolder, process.env.pngquantOptions || pngquantOptions, cluster.worker.id);

function compressPngFiles(inputFolder, outputFolder, options, id) {
    console.time('ExecTime');
    let listOfPngInputFiles = JSON.parse(fs.readFileSync('core_' + id + ".txt"));
    for (let pngPath of listOfPngInputFiles) {
        let inputPngPath = pngPath;
        let outputPngPath = pngPath.replace(inputFolder, outputFolder);
        shelljs.exec('pngquant.exe ' + options + " " + inputPngPath + " -o " + outputPngPath);
        console.log("Core", cluster.worker.id, "Compressed: ", inputPngPath, "to:", outputPngPath);
    }
    console.timeEnd("ExecTime");
    fs.unlinkSync('core_' + id + ".txt");//Remove core_i.txt file
    process.exit();
}