const axios = require('axios');
const fs = require('fs');
const readline = require('readline');
const { DateTime } = require('luxon');
const colors = require('colors');
const { HttpsProxyAgent } = require('https-proxy-agent');

class ValiantAPI {
    constructor(token, proxy) {
        this.token = token;
        this.proxy = proxy;
        this.headers = {
            'accept': '*/*',
            'accept-encoding': 'gzip, deflate, br',
            'accept-language': 'vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5',
            'authorization': `Bearer ${token}`,
            'content-type': 'application/json',
            'origin': 'https://mini.playvaliants.com',
            'referer': 'https://mini.playvaliants.com/',
            'sec-ch-ua': '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
            'sec-ch-ua-mobile': '?1',
            'sec-ch-ua-platform': '"Android"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-origin',
            'user-agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Mobile Safari/537.36',
            'x-pinggy-no-screen': 'true'
        };
    }

    async getData() {
        return this.http('https://mini.playvaliants.com/api/user/data');
    }

    async claimDailyReward() {
        return this.http('https://mini.playvaliants.com/api/rewards/claim', 'post');
    }

    async getMission() {
        return this.http('https://mini.playvaliants.com/api/user/missions');
    }

    async claimMission(payload) {
        return this.http('https://mini.playvaliants.com/api/missions/claim', 'post', payload);
    }

    async taptap(payload) {
        return this.http('https://mini.playvaliants.com/api/gameplay/click', 'post', payload);
    }

    async upgradeEnergy() {
        return this.http('https://mini.playvaliants.com/api/perks/energy-level-up', 'post', {});
    }

    async upgradeMultitap() {
        return this.http('https://mini.playvaliants.com/api/perks/click-level-up', 'post', {});
    }

    async http(url, method = 'get', data = {}) {
        try {
            const proxyAgent = this.proxy ? new HttpsProxyAgent(this.proxy) : undefined;
            const response = await axios({ url, method, headers: this.headers, data, httpsAgent: proxyAgent });
            if (response.status >= 400) {
                this.log(`Status Code: ${response.status} | ${response.statusText}`.red);
                return null;
            }
            return response.data;
        } catch (error) {
            if (error.response && error.response.status === 400 && error.response.data.message.startsWith('Not enough experience')) {
                this.log('Balance không đủ!'.red);
            } else {
                this.log(`Lỗi rồi: ${error}`.red);
                console.error(error);
            }
            return null;
        }
    }

    async checkProxyIP() {
        let attempts = 0;
        const maxAttempts = 1;
        while (attempts < maxAttempts) {
            try {
                const proxyAgent = new HttpsProxyAgent(this.proxy);
                const response = await axios.get('https://api.ipify.org?format=json', {
                    httpsAgent: proxyAgent
                });
                if (response.status === 200) {
                    return response.data.ip;
                } else {
                    this.log(`Không thể kiểm tra IP của proxy. Status code: ${response.status}`, 'warning');
                }
            } catch (error) {
                attempts++;
                this.log(`Error khi kiểm tra IP của proxy (Lần thử ${attempts}/${maxAttempts}): ${error.message}`.red);
                if (attempts < maxAttempts) {
                    await this.sleep(2000);
                } else {
                    this.log(`Error khi kiểm tra IP của proxy sau ${maxAttempts} lần thử: ${error.message}`, 'error');
                    break;
                }
            }
        }
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    log(msg, type = 'info') {
        const colorMap = {
            info: 'green',
            success: 'cyan',
            warning: 'yellow',
            error: 'red',
            default: 'white'
        };
        const color = colorMap[type] || colorMap.default;
        console.log(`[*] ${msg}`[color]);
    }

    async getConfig() {
        return this.http('https://mini.playvaliants.com/api/gameplay/config');
    }

    async unlock(id) {
        return this.http('https://mini.playvaliants.com/api/unlock', 'post', { id });
    }

}

async function waitWithCountdown(delay) {
    for (let i = delay; i >= 0; i--) {
        readline.cursorTo(process.stdout, 0);
        process.stdout.write(`===== Đã hoàn thành tất cả tài khoản, chờ ${i} giây để tiếp tục vòng lặp =====`);
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    console.log('');
}

const loadCredentials = () => {
    try {
        const data = fs.readFileSync('token.txt', 'utf-8');
        return data.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    } catch (err) {
        console.error("File token.txt not found or an error occurred:".red, err);
        return [];
    }
};

const loadProxies = () => {
    try {
        const data = fs.readFileSync('proxy.txt', 'utf-8');
        return data.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    } catch (err) {
        console.error("File proxy.txt not found or an error occurred:".red, err);
        return [];
    }
};

const main = async () => {
    const tokens = loadCredentials();
    const proxies = loadProxies();

    if (tokens.length !== proxies.length) {
        console.error('Lỗi: Số lượng token và proxy không khớp!'.red);
        console.log(`Số lượng token: ${tokens.length}`);
        console.log(`Số lượng proxy: ${proxies.length}`);
        console.log('Chương trình sẽ dừng lại do số lượng token và proxy không khớp.'.red);
        return;
    }

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const mission = await new Promise(resolve => rl.question("Bạn có muốn tự động làm nhiệm vụ không? (y/n): ", resolve));
    const upteam = await new Promise(resolve => rl.question("Bạn có muốn tự động mua thẻ (TEAM) không? (y/n): ", resolve));
    const autoUpdate = await new Promise(resolve => rl.question("Bạn có muốn tự động nâng cấp không? (y/n): ", resolve));

    let maxLevel = 0;
    if (autoUpdate === 'y') {
        maxLevel = await new Promise(resolve => rl.question("Lv tối đa muốn nâng cấp: ", resolve));
        maxLevel = parseInt(maxLevel, 10);
    }
    rl.close();

    while (true) {
        for (const [index, token] of tokens.entries()) {
            const proxy = proxies[index] || null;
            const api = new ValiantAPI(token, proxy);

            const proxyIP = await api.checkProxyIP();
            const dataLogin = await api.getData();

            if (dataLogin) {
                api.log(`\n========== Tài khoản ${index + 1} | IP: ${proxyIP} ==========`.blue);
                let { energy, energy_level, click_level, energy_cap, daily_reward, experience, experience_per_hour } = dataLogin;
                api.log(`Balance: ${experience}`, 'info');
                api.log(`Exp per Hour: ${experience_per_hour}/Hour`, 'info');
                api.log(`Năng Lượng: ${energy}/${energy_cap}`, 'info');

                if (!daily_reward.claimed) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    const dailyData = await api.claimDailyReward();
                    if (dailyData) {
                        api.log(`Đã điểm danh thành công ngày ${dailyData.day} | Phần thưởng: ${dailyData.reward}`, 'success');
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                } else {
                    api.log('Hôm nay bạn đã điểm danh rồi!'.yellow, 'warning');
                }

                if (upteam === 'y') {
                    const configData = await api.getConfig();
                    if (configData && configData.unlocks) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        for (const id of Object.keys(configData.unlocks)) {
                            const unlockData = await api.unlock(parseInt(id, 10));
                            if (unlockData) {
                                api.log(`Mở thẻ id ${id} thành công`, 'success');
                            } else {
                                api.log(`Mở thẻ id ${id} thất bại`, 'error');
                            }
                            await new Promise(resolve => setTimeout(resolve, 3000));
                        }                    
                    }
                }  

                if (autoUpdate === 'y') {
                    if (energy_level < maxLevel) {
                        api.log("Nâng cấp năng lượng tối đa...", 'info');
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        const upgradeData = await api.upgradeEnergy();
                        if (upgradeData) {
                            api.log(`Năng lượng được nâng cấp lên lv ${upgradeData.energy_level}`, 'success');
                        }
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                    if (click_level < maxLevel) {
                        api.log("Nâng cấp multitap...", 'info');
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        const upgradeData = await api.upgradeMultitap();
                        if (upgradeData) {
                            api.log(`Multi được nâng cấp thành công ${upgradeData.click_level}`, 'success');
                        }
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                }

                if (mission === 'y') {
                    const missionData = await api.getMission();
                    if (missionData) {
                        for (const mission of missionData.missions) {
                            if (mission.type === 'referral') continue;
                            if (!mission.claimed) {
                                await new Promise(resolve => setTimeout(resolve, 2000));
                                const payload = { id: mission.id };
                                const claimData = await api.claimMission(payload);
                                if (claimData) {
                                    api.log(`Làm nhiệm vụ ${mission.id} thành công | Phần thưởng: ${claimData.reward}`, 'success');
                                }
                            }
                        }
                    }
                }

                while (true) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    const tap = Math.min(randomInt(50, 60), energy);
                    const tapData = await api.taptap({ count: tap });
                
                    if (tapData) {
                        const { user_energy, reward } = tapData;
                        api.log(`Tap được ${reward} lần, Năng lượng còn: ${user_energy}`, 'success');
                        energy = user_energy;
                    } else {
                        api.log('Không thể lấy dữ liệu!'.red, 'error');
                        break;
                    }
                
                    if (energy < 50) {
                        api.log('Năng lượng dưới 50, dừng tap cho tài khoản này.', 'warning');
                        break;
                    }
                }
            }
        }
        const delay = randomInt(300, 500);
        await waitWithCountdown(delay);
    }
};

const randomInt = (min, max) => Math.floor(Math.random() * (min + (max - min + 1)));

main().catch(err => console.error(err.red));
