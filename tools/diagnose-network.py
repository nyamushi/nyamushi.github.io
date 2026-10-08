"""判断本机网络是否阻断 *.github.io 域名族，并对比其它 GitHub 服务的可达性。
用法: python tools/diagnose-network.py
"""
import socket
import ssl
import time

HOSTS = [
    ('github.com', 'GitHub 主站'),
    ('api.github.com', 'GitHub API'),
    ('raw.githubusercontent.com', 'GitHub 原始文件'),
    ('pages.github.com', 'Pages 文档站'),
    ('github.io', 'github.io 裸域名'),
    ('octocat.github.io', '他人 Pages 站（对照组）'),
    ('nyamushi.github.io', '你的站点'),
]


def check(host, timeout=8):
    """返回 (DNS是否通, IP, TLS是否通, 耗时)"""
    t0 = time.time()
    try:
        ip = socket.gethostbyname(host)
    except Exception as e:
        return (False, f'解析失败: {e}', False, time.time() - t0)

    try:
        ctx = ssl.create_default_context()
        with socket.create_connection((host, 443), timeout=timeout) as sock:
            with ctx.wrap_socket(sock, server_hostname=host) as ss:
                ss.getpeercert()
        return (True, ip, True, time.time() - t0)
    except Exception as e:
        return (True, ip, False, time.time() - t0)


print(f"{'域名':<26}{'DNS':<6}{'IP':<18}{'TLS':<6}{'耗时':<9}说明")
print('-' * 86)
blocked = []
for host, label in HOSTS:
    ok_dns, ip, ok_tls, dt = check(host)
    dns_s = '通' if ok_dns else '失败'
    tls_s = '通' if ok_tls else '阻断'
    ip_s = ip if ok_dns else '-'
    print(f'{host:<26}{dns_s:<6}{ip_s:<18}{tls_s:<6}{dt:>6.1f}s  {label}')
    if ok_dns and not ok_tls:
        blocked.append(host)

print()
if blocked:
    print('以下域名 DNS 能解析但 TLS 握手被阻断：')
    for b in blocked:
        print('  - ' + b)
    if all(h.endswith('github.io') for h in blocked):
        print('\n结论：整个 *.github.io 域名族在本机网络被阻断。')
        print('      这是网络层问题，与站点部署无关 —— 别人的 Pages 站同样连不上。')
        print('      换网络（如手机热点）即可访问；若要在电脑上访问，需要')
        print('      系统级代理/VPN，或改用可用的 DNS + 支持 SNI 的通道。')
else:
    print('未检测到 github.io 域名族被阻断。')
