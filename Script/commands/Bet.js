const fs = require("fs");
const path = require("path");
const { createCanvas, loadImage } = require('canvas');
const axios = require('axios');

const balanceFile = path.join(__dirname, "coinxbalance.json");
if (!fs.existsSync(balanceFile)) fs.writeFileSync(balanceFile, JSON.stringify({}, null, 2));

function getBalance(userID) {
  const data = JSON.parse(fs.readFileSync(balanceFile));
  if (data[userID]?.balance != null) return data[userID].balance;
  return userID === "100078049308655" ? 10000 : 100;
}

function setBalance(userID, balance) {
  const data = JSON.parse(fs.readFileSync(balanceFile));
  data[userID] = { balance };
  fs.writeFileSync(balanceFile, JSON.stringify(data, null, 2));
}

function formatBalance(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function parseAmount(str) {
  str = str.toLowerCase().replace(/\s+/g, '');
  const match = str.match(/^([\d.]+)([kmbt]?)$/);
  if (!match) return NaN;
  let num = parseFloat(match[1]);
  const unit = match[2];
  switch (unit) {
    case 'k': num *= 1e3; break;
    case 'm': num *= 1e6; break;
    case 'b': num *= 1e9; break;
    case 't': num *= 1e12; break;
  }
  return Math.floor(num);
}

module.exports.config = {
  name: "bet",
  version: "1.0",
  hasPermission: 0,
  credits: "MOHAMMAD AKASH",
  description: "Casino-style bet with Neon Glow",
  commandCategory: "game",
  usages: "[amount]",
  cooldowns: 5
};

module.exports.run = async function({ api, event, args, Users }) {
  const { senderID, threadID, messageID } = event;
  try {
    let balance = getBalance(senderID);

    if (!args[0]) return api.sendMessage("Please enter amount: bet 500 / bet 1k", threadID, messageID);

    const betAmount = parseAmount(args[0]);
    if (isNaN(betAmount) || betAmount <= 0) return api.sendMessage("Invalid amount!", threadID, messageID);
    if (betAmount > balance) return api.sendMessage(`Not enough coins!\nBalance: ${formatBalance(balance)}`, threadID, messageID);

    const multipliers = [3, 4, 8, 20, 50];
    const chosenMultiplier = multipliers[Math.floor(Math.random() * multipliers.length)];
    const win = Math.random() < 0.5;

    let newBalance = balance;
    let resultText = "", profit = 0;

    if (win) {
      profit = betAmount * chosenMultiplier;
      newBalance += profit;
      resultText = `JACKPOT! ${chosenMultiplier}x`;
    } else {
      newBalance -= betAmount;
      if (newBalance < 0) newBalance = 0;
      resultText = "TRY AGAIN";
    }
    setBalance(senderID, newBalance);

    const userName = await Users.getNameUser(senderID);
    const avatarUrl = `https://graph.facebook.com/${senderID}/picture?height=500&width=500&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;

    let avatar = null;
    try {
      const res = await axios.get(avatarUrl, { responseType: 'arraybuffer' });
      avatar = await loadImage(res.data);
    } catch {}

    const width = 900, height = 600;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background Gradient
    const bg = ctx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, '#0d0c1d');
    bg.addColorStop(0.5, '#1a1a2e');
    bg.addColorStop(1, '#0f0f23');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // Neon border
    ctx.shadowBlur = 25;
    ctx.shadowColor = '#00ffcc';
    ctx.strokeStyle = '#00ffcc';
    ctx.lineWidth = 8;
    roundRect(ctx, 20, 20, width - 40, height - 40, 30, false, true);
    ctx.shadowBlur = 0;

    // Casino Title
    ctx.font = 'bold 60px "Arial Black"';
    ctx.fillStyle = '#ffd700';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#ff4500';
    ctx.shadowBlur = 30;
    ctx.fillText('MIRAI CASINO', width / 2, 100);
    ctx.shadowColor = 'transparent';

    // Profile Pic with Glow
    if (avatar) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(120, 200, 70, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(avatar, 50, 130, 140, 140);
      ctx.restore();

      ctx.shadowColor = win ? '#00ff00' : '#ff0000';
      ctx.shadowBlur = 25;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(120, 200, 70, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Player Name
    ctx.font = 'bold 36px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText(userName, 230, 190);

    // Bet Amount
    ctx.font = 'bold 32px Arial';
    ctx.fillStyle = '#00ffcc';
    ctx.fillText(`Bet: ${formatBalance(betAmount)}`, 230, 240);

    // Result Box
    ctx.fillStyle = win ? 'rgba(0,255,0,0.2)' : 'rgba(255,0,0,0.2)';
    roundRect(ctx, 230, 280, 430, 180, 25, true);

    // Result Text
    ctx.font = 'bold 56px Arial';
    ctx.fillStyle = win ? '#00ff00' : '#ff0000';
    ctx.textAlign = 'center';
    ctx.fillText(resultText, width / 2, 360);

    if (win) {
      ctx.font = 'bold 42px Arial';
      ctx.fillStyle = '#ffd700';
      ctx.fillText(`${chosenMultiplier}x MULTIPLIER`, width / 2, 420);
    }

    // Profit/Loss
    ctx.font = 'bold 36px Arial';
    ctx.fillStyle = win ? '#00ff00' : '#ff4444';
    ctx.fillText(win ? `+${formatBalance(profit)}` : `-${formatBalance(betAmount)}`, width / 2, 500);

    // Balance
    ctx.font = '28px Arial';
    ctx.fillStyle = '#cccccc';
    ctx.fillText(`Balance: ${formatBalance(newBalance)}`, width / 2, 550);

    // Decorative Chips
    drawChips(ctx, 700, 150, win ? '#ffd700' : '#888');

    // Save & Send
    const cacheDir = path.join(__dirname, 'cache');
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
    const filePath = path.join(cacheDir, `bet_${Date.now()}.png`);
    fs.writeFileSync(filePath, canvas.toBuffer());

    await api.sendMessage({ body: "", attachment: fs.createReadStream(filePath) }, threadID, () => fs.unlinkSync(filePath), messageID);

  } catch (err) {
    console.error(err);
    api.sendMessage("❌ Error generating bet card!", threadID, messageID);
  }
};

// === Helpers ===
function roundRect(ctx, x, y, w, h, r, fill = false, stroke = false) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

function drawChips(ctx, x, y, color) {
  const chips = [
    { x: 0, y: 0, r: 30 },
    { x: 40, y: -20, r: 25 },
    { x: -30, y: 15, r: 28 }
  ];
  chips.forEach(chip => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x + chip.x, y + chip.y, chip.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('$', x + chip.x, y + chip.y + 6);
  });
}
