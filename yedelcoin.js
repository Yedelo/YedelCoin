import { registerSubcommand } from "../FPLanguage/commands/commands";
import { registerToplevelHandler } from "../FPLanguage/commands/toplevel/toplevel";
import { LocalStore } from "../tska/storage/LocalStore";

const EXCHANGE_RATE_DELAY = 60;

const theSafe = new LocalStore("YedelCoin", {
    Yedel: {
        amount: 1500,
        premium: true
    }
}, "data/persistent/theSafe.json");
const currencies = new LocalStore("YedelCoin", {
    usd: {
        symbol: "$",
        min: 0.25,
        max: 0.50
    },
    eur: {
        symbol: "€",
        min: 0.25,
        max: 0.50
    }
}, "data/persistent/currencies.json");
global.theSafe = theSafe;
const miningCooldownMap = new Map();

    function validatePlayer(playerName) {
        if (!theSafe[playerName]) {
            theSafe[playerName] = {
                amount: 0,
                premium: false
            };
        }
    }   

    function crement(playerName, amount) {
        theSafe[playerName].amount += amount;
    }

    function getMiningCooldown(yedelCoinAmount, premium) {
        const scalingFactor = 25000;
  
        yedelCoinAmount = Math.max(0, Math.min(yedelCoinAmount, scalingFactor));
        const maxRange = 30;
        const minRange = 0;

        const result = maxRange - (maxRange - minRange) * Math.log1p(yedelCoinAmount) / Math.log1p(scalingFactor);

        let wouldBeFinal = Math.max(minRange, Math.min(result, maxRange));
        if (premium) {
            wouldBeFinal = wouldBeFinal / 1.5;
        }
        return Math.round(wouldBeFinal);
    }

    function resetCooldown(playerName) {
        this.miningCooldownMap.set(playerName, this.getMiningCooldown(theSafe[playerName].amount, theSafe[playerName].premium));
    }

    function refreshExchangeRate(currencyCode) {
        currency = currencies[currencyCode];
        currency.currentRate = randomNumber(currency.min, currency.max);
    }

    function refreshExchangeRates() { 
        Object.entries(currencies).forEach(([key, value]) => {
            if (key == "getModuleData") return;
            refreshExchangeRate(key);
        });
    }

    refreshExchangeRates();

registerToplevelHandler((source) => {
    if (source.args.get(0) != "yedelcoin") return;
    const name = source.name;
    validatePlayer(name);
    const command = source.args.get("command") || source.args.get(1);
    const currentYedelCoinCount = theSafe[name].amount;
    let pass;
    Object.entries(currencies).forEach(([key, value]) => {
        if (command == key) {
            const symbol = value.symbol;
            const exchanged = round(currentYedelCoinCount * value.currentRate, 2);
            source.respond(`${currentYedelCoinCount} YedelCoins = ${symbol}${exchanged} (1 YedelCoin = ${symbol}${round(value.currentRate, 2)}).`);
            pass = true;
        }
    });
    if (pass) return;
    switch (command) {
        case "mine":
            const cooldownSeconds = miningCooldownMap.get(name);
            const premiumStatus = theSafe[name].premium ? " (premium)" : "";
            if (cooldownSeconds > 0) {
                source.respond(`You're currently on cooldown! Wait ${cooldownSeconds}s to use this command again.${premiumStatus}`);
                break;
            }
            let increase = randomInt(10, 30);
            if (theSafe[name].premium) increase *= 2;
            crement(name, increase);
            source.respond(`You mined up ${increase} YedelCoins! You now have ${theSafe[name].amount} YedelCoins.${premiumStatus}`);
            resetCooldown(name);
            break;
        case "premium":
            source.respond("For the low price of 1000 YedelCoins, you can buy YedelCoin Premium, which gives you 1.5x more coins and 1.5x shorter cooldown.");
            setTimeout(() => {
                source.respond("If you want to buy Premium, type !yedelcoin yesiwanttobuypremium.");
            }, 1000);
            break;
        case "yesiwanttobuypremium":
            if (theSafe[name].amount < 1000) {
                source.respond("You don't have the required 1000 YedelCoins to buy Premium!");
                return;
            }
            theSafe[name].amount -= 1000;
            theSafe[name].premium = true;
            source.respond("Bought YedelCoin Premium! Enjoy more coins and shorter cooldowns.");
            break;
        default:
            source.respond(`You currently have ${currentYedelCoinCount} YedelCoins.`);
            break;
  }
});

registerSubcommand("addcurrency", (source) => {
    if (!source.admin) return;
        const currencyCode = source.args.get("currencyCode") || source.args.get(0);
        const symbol = source.args.get("symbol") || source.args.get(1);
        const min = source.args.get("min") || source.args.get(2);
        const max = source.args.get("max") || source.args.get(3);
        currencies[currencyCode] = {
            symbol: symbol,
            min: Number(min),
            max: Number(max)
        }
        refreshExchangeRate(currencyCode);
        source.respond(`Added currency ${currencyCode} with symbol ${symbol}, min ${min} and max ${max}!`);
});

register("step", () => {
    miningCooldownMap.forEach((seconds, player, map) => {
        map.set(player, seconds - 1);
    });
}).setFps(1);

register("step", () => {
    refreshExchangeRates();
}).setDelay(EXCHANGE_RATE_DELAY);

function round(number, decimals) {
    let something = Math.pow(10, decimals);
    return Math.round(number * something) / something;
}

function randomInt(min, max) {
    return Math.round(randomNumber(min, max));
}

function randomNumber(min, max) {
    return Math.random() * (max - min) + min;
}