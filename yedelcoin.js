import { registerSubcommand } from "../FPLanguage/commands/commands";
import { registerToplevelHandler } from "../FPLanguage/toplevel/toplevel";
import { LocalStore } from "../tska/storage/LocalStore";

const EXCHANGE_RATE_DELAY = 60;

const theSafe = new LocalStore("YedelCoin", {
    Yedel: {
        amount: 1500,
        premium: true
    }
}, "theSafe.json");
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
}, "currencies.json");
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

    function getMiningCooldown(yedelCoinAmount) {
        const scalingFactor = 25000;
  
        yedelCoinAmount = Math.max(0, Math.min(yedelCoinAmount, scalingFactor));
        const maxRange = 30;
        const minRange = 0;

        const result = maxRange - (maxRange - minRange) * Math.log1p(yedelCoinAmount) / Math.log1p(scalingFactor);

        return Math.round(Math.max(minRange, Math.min(result, maxRange)));
    }

    function resetCooldown(playerName) {
        this.miningCooldownMap.set(playerName, this.getMiningCooldown(theSafe[playerName].amount));
    }

    function refreshExchangeRate(currencyCode) {
        currency = currencies[currencyCode];
        currency.currentRate = randomNumber(currency.min, currency.max);
        ChatLib.chat(`Refreshed ${currencyCode} to ${currency.currentRate}`);
    }

    function refreshExchangeRates() { 
        Object.entries(currencies).forEach(([key, value]) => {
            if (key == "getModuleData") return;
            refreshExchangeRate(key);
        });
    }

    refreshExchangeRates();

registerToplevelHandler((name, args, sourceCallback, admin) => {
    if (args.get(0) != "yedelcoin") return;
    validatePlayer(name);
    const command = args.get("command") || args.get(1);
    const currentYedelCoinCount = theSafe[name].amount;
    let pass;
    Object.entries(currencies).forEach(([key, value]) => {
        if (command == key) {
            const symbol = value.symbol;
            const exchanged = round(currentYedelCoinCount * value.currentRate, 2);
            sourceCallback(`${currentYedelCoinCount} YedelCoin${getOptionalSuffix(currentYedelCoinCount)} = ${symbol}${exchanged} (1 YedelCoin = ${symbol}${round(value.currentRate, 2)}).`);
            pass = true;
        }
    });
    if (pass) return;
    switch (command) {
        case "mine":
            const cooldownSeconds = miningCooldownMap.get(name);
            if (cooldownSeconds > 0) {
                sourceCallback(`You're currently on cooldown! Wait ${cooldownSeconds}s to use this command again.`);
                break;
            }
            const increase = randomInt(10, 30);
            crement(name, increase);
            sourceCallback(`You mined up ${increase} YedelCoin${getOptionalSuffix(increase)}! You now have ${theSafe[name].amount} YedelCoin${getOptionalSuffix(currentYedelCoinCount)}.`);
            resetCooldown(name);
            break;
        default:
            sourceCallback(`You currently have ${currentYedelCoinCount} YedelCoin${getOptionalSuffix(currentYedelCoinCount)}.`);
            break;
  }
});

registerSubcommand("addcurrency", (name, args, sourceCallback, admin) => {
    if (!admin) return;
            const currencyCode = args.get("currencyCode") || args.get(0);
        const symbol = args.get("symbol") || args.get(1);
        const min = args.get("min") || args.get(2);
        const max = args.get("max") || args.get(3);
        currencies[currencyCode] = {
            symbol: symbol,
            min: Number(min),
            max: Number(max)
        }
        refreshExchangeRate(currencyCode);
        sourceCallback(`Added currency ${currencyCode} with symbol ${symbol}, min ${min} and max ${max}!`);
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

function getOptionalSuffix(number) {
    return number != 1 ? "s" : "";
}
