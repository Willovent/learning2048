function getInputs(grid) {
    let values = grid.cells.map(col =>
        col.map((tile) => tile ? tile.value : 0)
    );
    let unnormalizedInputs = [].concat(...values);
    let max = Math.max(...unnormalizedInputs);
    return unnormalizedInputs.map(x => x / max);
}

function moveFromOutput(game, output) {
    let move = output.indexOf(Math.max(...output));
    game.move(move);
}

function generateInitialPopulation(size) {
    return new Promise(function (resolve) {
        let archi = new synaptic.Architect.Perceptron(16, 100, 4);
        let population = [];
        let lastPosition = "";
        let interval = setInterval(() => {
            let currentPosition = JSON.stringify(game.grid);
            if (game.over || game.won || currentPosition == lastPosition) {
                population.push({
                    network: archi.toJSON(),
                    fitness: game.score
                })
                if (population.length == size) {
                    clearInterval(interval);
                    resolve(population);
                }
                archi = new synaptic.Architect.Perceptron(16, 100, 4);
                game.restart();
            }
            lastPosition = currentPosition;
            let inputs = getInputs(game.grid);
            let output = archi.activate(inputs);
            moveFromOutput(game, output);
        }, 100)
    })
}

function crossOver(parentA, parentB) {
    var cutPoint = random(0, parentA.neurons.length - 1);
    for (var i = cutPoint; i < parentA.neurons.length; i++) {
        var biasFromParentA = parentA.neurons[i]['bias'];
        parentA.neurons[i]['bias'] = parentB.neurons[i]['bias'];
        parentB.neurons[i]['bias'] = biasFromParentA;
    }

    return random(0, 1) == 1 ? parentA : parentB;
}

function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function getRandomNeuralNetwork(population) {
    let totalFitness = population.map(x => x.fitness).reduce((pv, cv) => pv + cv, 0);
    let rand = Math.random() * totalFitness;
    let index = -1;
    while (rand > 0) {
        rand -= population[++index].fitness;
    }
    return population[index].network;
}

function playPopulation(population) {
    return new Promise(function (resolve) {
        let currentPopIndex = 0;
        let archi = synaptic.Architect.Perceptron.fromJSON(population[currentPopIndex].network);
        let lastPosition = "";
        let interval = setInterval(() => {
            let currentPosition = JSON.stringify(game.grid);
            if (game.over || game.won || currentPosition == lastPosition) {
                population[currentPopIndex].fitness = game.score;
                if (population.length - 1 == currentPopIndex) {
                    clearInterval(interval);
                    resolve(population);
                } else {
                    archi = synaptic.Architect.Perceptron.fromJSON(population[++currentPopIndex].network);
                }
                game.restart();
            }
            lastPosition = currentPosition;
            let inputs = getInputs(game.grid);
            let output = archi.activate(inputs);
            moveFromOutput(game, output);
        }, 10)
    })
}

function nextGeneration(population) {
    let newPop = [];
    for (let i = 0; i < population.length; i++) {
        let parentA = getRandomNeuralNetwork(population);
        let parentB = getRandomNeuralNetwork(population);
        newPop.push({
            network: mutation(crossOver(parentA, parentB)),
            fitness: 0
        });
    }
    return newPop;
}


function mutate(gene) {
    if (Math.random() < 0.04) {
        var mutateFactor = 1 + ((Math.random() - 0.5) * 3 + (Math.random() - 0.5));
        gene *= mutateFactor;
    }

    return gene;
}

function mutation(network) {
    for (var i = 0; i < network.neurons.length; i++) {
        network.neurons[i]['bias'] = this.mutate(network.neurons[i]['bias']);
    }

    for (var i = 0; i < network.connections.length; i++) {
        network.connections[i]['weight'] = this.mutate(network.connections[i]['weight']);
    }

    return network;
}


async function start() {
    let generationHtml = document.querySelector("#generation strong");
    let size = 50;
    let currentGeneration = 0;
    generationHtml.innerText = currentGeneration;
    let population = await generateInitialPopulation(size);
    while (true) {
        currentGeneration++;
        generationHtml.innerText = currentGeneration;
        population = nextGeneration(population);
        await playPopulation(population);

    }
}

setTimeout(start);