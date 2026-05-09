from collections import deque
from pathlib import Path
from PIL import Image
from slice_host_sheet import remove_connected_black_bg

sheet = Image.open(r'C:\Users\gurwn\Desktop\사회자.png').convert('RGBA')
w,h=sheet.size
xs=[0,w//2,w]
ys=[round(i*h/4) for i in range(5)]
for r in range(4):
    for c in range(2):
        img=remove_connected_black_bg(sheet.crop((xs[c],ys[r],xs[c+1],ys[r+1])))
        a=img.getchannel('A')
        pix=a.load(); W,H=img.size
        seen=set(); comps=[]
        for y in range(H):
            for x in range(W):
                if (x,y) in seen or pix[x,y]==0: continue
                q=deque([(x,y)]); seen.add((x,y)); count=0; minx=maxx=x; miny=maxy=y
                while q:
                    px,py=q.popleft(); count+=1; minx=min(minx,px); maxx=max(maxx,px); miny=min(miny,py); maxy=max(maxy,py)
                    for nx,ny in ((px+1,py),(px-1,py),(px,py+1),(px,py-1)):
                        if 0<=nx<W and 0<=ny<H and (nx,ny) not in seen and pix[nx,ny]>0:
                            seen.add((nx,ny)); q.append((nx,ny))
                comps.append((count,(minx,miny,maxx+1,maxy+1)))
        comps=sorted(comps, reverse=True)[:8]
        print('cell',r,c,'size',img.size,'bbox',a.getbbox())
        for comp in comps: print(' ',comp)
