'use strict';
(() => {
  const data = window.SALES_DATA;
  const names = ['한빛테크', '미래솔루션', '새봄산업'];
  const colors = ['#355ee8', '#12a99b', '#ec9c36'];
  const years = [2021, 2022, 2023, 2024, 2025];
  const $ = id => document.getElementById(id);
  const fmt = n => n.toLocaleString('ko-KR', {minimumFractionDigits:2, maximumFractionDigits:2});
  const sum = values => Math.round(values.reduce((a,b) => a+b, 0) * 100) / 100;
  let mode = 'annual', sortKey = 'date', sortAsc = true, current = [];
  $('companies').innerHTML = names.map((name,i) => `<label><input type="checkbox" value="${i}" checked>${name}</label>`).join('');
  for (const id of ['start','end']) $(''+id).innerHTML = years.map(y => `<option value="${y}">${y}년</option>`).join('');
  $('end').value = '2025';
  const selected = () => [...$('companies').querySelectorAll('input:checked')].map(el => Number(el.value));
  function aggregate(rows) {
    if (mode === 'monthly') return rows.map(r => ({date:r.date, values:[...r.values]}));
    return [...new Set(rows.map(r => r.date.slice(0,4)))].map(year => ({date:year,values:names.map((_,i) => sum(rows.filter(r => r.date.startsWith(year)).map(r => r.values[i])))}));
  }
  function render() {
    const ids = selected(), start = Number($('start').value), end = Number($('end').value);
    const rows = data.filter(r => Number(r.date.slice(0,4)) >= start && Number(r.date.slice(0,4)) <= end);
    const totals = names.map((_,i) => sum(rows.map(r => r.values[i])));
    const total = sum(ids.map(i => totals[i]));
    current = aggregate(rows);
    $('status').textContent = `${start}년 1월 — ${end}년 12월 · ${rows.length}개월 · ${ids.length}개 기업 선택`;
    const yearTotal = y => sum(data.filter(r => r.date.startsWith(String(y))).flatMap(r => ids.map(i => r.values[i])));
    const previous = yearTotal(end-1), growth = previous ? (yearTotal(end)/previous-1)*100 : null;
    const leader = [...ids].sort((a,b) => totals[b]-totals[a])[0];
    const card = (label,value,detail) => `<article class="kpi"><div class="kpi-label">${label}</div><div class="kpi-value">${value}</div><div class="kpi-detail">${detail}</div></article>`;
    $('kpis').innerHTML = card('누적 매출',`${fmt(total)}<small>억원</small>`,'선택 기업 · 전체 선택 기간 합계') + card('월평균 매출',`${fmt(total/rows.length)}<small>억원</small>`,`${rows.length}개월 기준 · 선택 기업 합산`) + card(`${end}년 매출 성장률`,growth === null ? '—' : `${growth>=0?'+':''}${fmt(growth)}<small>%</small>`,previous ? `${end-1}년 대비 · 선택 기업 합산` : '비교할 직전 연도 데이터 없음') + card('누적 매출 1위',leader === undefined ? '—' : names[leader],leader === undefined ? '기업을 선택하세요' : `${fmt(totals[leader])}억원 · 선택 기업 내 순위`);
    $('monthly').setAttribute('aria-pressed',String(mode==='monthly'));
    $('annual').setAttribute('aria-pressed',String(mode==='annual'));
    $('chartSubtitle').textContent = `${start}—${end} · ${mode==='annual'?'연간':'월간'} 매출 비교`;
    $('legend').innerHTML = ids.map(i => `<span><i class="swatch" style="background:${colors[i]}"></i>${names[i]}</span>`).join('');
    drawChart(ids);
    $('share').innerHTML = ids.length ? `<div class="share-total">${fmt(total)} <small>억원</small></div>` + [...ids].sort((a,b)=>totals[b]-totals[a]).map(i => `<div class="share-row"><div class="share-label"><span>${names[i]}</span><strong>${(totals[i]/total*100).toFixed(1)}%</strong></div><div class="track"><div class="bar" style="width:${totals[i]/total*100}%;background:${colors[i]}"></div></div><div class="share-caption">${fmt(totals[i])}억원</div></div>`).join('') : '<p class="empty">비교할 기업을 선택하세요.</p>';
    $('tableSubtitle').textContent = `${current.length}개 ${mode==='annual'?'연도':'월'} · 단위: 억원 · 열 제목을 눌러 정렬`;
    renderTable(ids);
    $('export').disabled = !ids.length;
  }
  function drawChart(ids) {
    if (!ids.length) { $('chart').innerHTML='<p class="empty">비교할 기업을 선택하세요.</p>'; return; }
    const width=760,height=310,left=52,right=20,top=22,bottom=42;
    const maximum=Math.max(...current.flatMap(r => ids.map(i=>r.values[i])));
    const step=Math.max(1,Math.ceil(maximum/4/5)*5), max=step*4;
    const x=i=>left+(width-left-right)*(current.length===1?.5:i/(current.length-1));
    const y=v=>height-bottom-(height-top-bottom)*v/max;
    let svg=`<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${mode==='annual'?'연간':'월간'} 기업별 매출 추이. 정확한 수치는 아래 상세 표에서도 확인할 수 있습니다.">`;
    for(let i=0;i<=4;i++) svg+=`<line x1="${left}" x2="${width-right}" y1="${y(i*step)}" y2="${y(i*step)}" stroke="#e9edf5" stroke-dasharray="4 4"/><text x="${left-12}" y="${y(i*step)+4}" text-anchor="end">${i*step}</text>`;
    current.forEach((r,i)=>{if(current.length<=12 || i%12===0 || i===current.length-1) svg+=`<text x="${x(i)}" y="${height-12}" text-anchor="middle">${r.date}</text>`;});
    ids.forEach(id=>{
      svg+=`<polyline fill="none" stroke="${colors[id]}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" points="${current.map((r,i)=>`${x(i)},${y(r.values[id])}`).join(' ')}"/>`;
      current.forEach((r,i)=>{const label=`${r.date} ${names[id]} ${fmt(r.values[id])}억원`;svg+=`<circle cx="${x(i)}" cy="${y(r.values[id])}" r="${mode==='monthly'?3.5:5}" fill="${colors[id]}" tabindex="0" aria-label="${label}"><title>${label}</title></circle>`;});
    });
    $('chart').innerHTML=svg+'</svg>';
  }
  function sortedRows(ids) {
    return [...current].sort((a,b)=>{const value=r=>sortKey==='date'?r.date:sortKey==='total'?sum(ids.map(i=>r.values[i])):r.values[Number(sortKey)];const av=value(a),bv=value(b);return (av<bv?-1:av>bv?1:0)*(sortAsc?1:-1);});
  }
  function renderTable(ids) {
    const columns=[['date',mode==='annual'?'연도':'기준월'],...ids.map(i=>[String(i),names[i]]),['total','합계']];
    $('thead').innerHTML='<tr>'+columns.map(([key,label])=>`<th scope="col" aria-sort="${key===sortKey?(sortAsc?'ascending':'descending'):'none'}"><button data-sort="${key}">${label} ${key===sortKey?(sortAsc?'↑':'↓'):'↕'}</button></th>`).join('')+'</tr>';
    $('tbody').innerHTML=ids.length?sortedRows(ids).map(r=>`<tr><td>${r.date}${mode==='annual'?'년':''}</td>${ids.map(i=>`<td>${fmt(r.values[i])}</td>`).join('')}<td><strong>${fmt(sum(ids.map(i=>r.values[i])))}</strong></td></tr>`).join(''):'<tr><td colspan="2" class="empty">비교할 기업을 선택하세요.</td></tr>';
    $('tfoot').innerHTML=ids.length?`<tr><td>기간 합계</td>${ids.map(i=>`<td>${fmt(sum(current.map(r=>r.values[i])))}</td>`).join('')}<td>${fmt(sum(current.flatMap(r=>ids.map(i=>r.values[i]))))}</td></tr>`:'';
  }
  $('companies').addEventListener('change',()=>{sortKey='date';render();});
  $('start').addEventListener('change',()=>{if(Number($('start').value)>Number($('end').value)) $('end').value=$('start').value;render();});
  $('end').addEventListener('change',()=>{if(Number($('end').value)<Number($('start').value)) $('start').value=$('end').value;render();});
  for(const unit of ['monthly','annual']) $(unit).addEventListener('click',()=>{mode=unit;render();});
  $('reset').addEventListener('click',()=>{$('start').value='2021';$('end').value='2025';document.querySelectorAll('#companies input').forEach(el=>el.checked=true);mode='annual';sortKey='date';sortAsc=true;render();});
  $('thead').addEventListener('click',e=>{const button=e.target.closest('button[data-sort]');if(!button)return;const key=button.dataset.sort;sortAsc=key===sortKey?!sortAsc:true;sortKey=key;renderTable(selected());});
  $('export').addEventListener('click',()=>{const ids=selected();const lines=[['기간',...ids.map(i=>names[i]+' 매출(억원)'),'합계(억원)'],...sortedRows(ids).map(r=>[r.date,...ids.map(i=>r.values[i].toFixed(2)),sum(ids.map(i=>r.values[i])).toFixed(2)])];const blob=new Blob(['\uFEFF'+lines.map(r=>r.join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`매출분석_${$('start').value}-${$('end').value}_${mode==='annual'?'연간':'월간'}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  render();
})();
