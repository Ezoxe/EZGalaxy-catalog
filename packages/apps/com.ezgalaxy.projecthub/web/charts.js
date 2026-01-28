/**
 * Project Hub - Charts Library
 * Custom SVG-based charts that actually render
 */

(function(global) {
    'use strict';

    // SVG Namespace
    var SVG_NS = 'http://www.w3.org/2000/svg';

    // Helper to create SVG elements
    function svgEl(tag, attrs, children) {
        var el = document.createElementNS(SVG_NS, tag);
        if (attrs) {
            for (var key in attrs) {
                if (attrs.hasOwnProperty(key)) {
                    el.setAttribute(key, attrs[key]);
                }
            }
        }
        if (children) {
            if (Array.isArray(children)) {
                children.forEach(function(child) {
                    if (child) el.appendChild(child);
                });
            } else if (typeof children === 'string') {
                el.textContent = children;
            } else {
                el.appendChild(children);
            }
        }
        return el;
    }

    // ========================================================================
    // LINE CHART
    // ========================================================================
    function createLineChart(container, data, options) {
        options = options || {};
        var width = options.width || container.clientWidth || 400;
        var height = options.height || 200;
        var padding = options.padding || { top: 20, right: 20, bottom: 35, left: 50 };
        var lineColor = options.color || '#00d4ff';
        var showArea = options.showArea !== false;
        var showDots = options.showDots !== false;
        var showGrid = options.showGrid !== false;
        var animate = options.animate !== false;
        var dataKey = options.dataKey || 'y';
        var labelKey = options.labelKey || 'label';

        container.innerHTML = '';

        if (!data || data.length === 0) {
            container.innerHTML = '<div class="chart-empty">No data available</div>';
            return;
        }

        var chartWidth = width - padding.left - padding.right;
        var chartHeight = height - padding.top - padding.bottom;

        // Get values
        var values = data.map(function(d) { return d[dataKey] || 0; });
        var minY = Math.min.apply(null, values) * 0.9;
        var maxY = Math.max.apply(null, values) * 1.1;
        if (minY === maxY) { minY -= 1; maxY += 1; }

        // Scales
        var xScale = function(i) { 
            return padding.left + (i / Math.max(data.length - 1, 1)) * chartWidth; 
        };
        var yScale = function(v) { 
            return padding.top + chartHeight - ((v - minY) / (maxY - minY)) * chartHeight; 
        };

        // Create SVG
        var svg = svgEl('svg', {
            width: width,
            height: height,
            viewBox: '0 0 ' + width + ' ' + height,
            class: 'chart-svg line-chart'
        });

        // Defs for gradient
        var defs = svgEl('defs');
        var gradientId = 'lineGrad-' + Math.random().toString(36).substr(2, 9);
        var gradient = svgEl('linearGradient', { id: gradientId, x1: '0%', y1: '0%', x2: '0%', y2: '100%' });
        gradient.appendChild(svgEl('stop', { offset: '0%', 'stop-color': lineColor, 'stop-opacity': '0.4' }));
        gradient.appendChild(svgEl('stop', { offset: '100%', 'stop-color': lineColor, 'stop-opacity': '0' }));
        defs.appendChild(gradient);
        svg.appendChild(defs);

        // Grid lines
        if (showGrid) {
            var gridGroup = svgEl('g', { class: 'grid' });
            for (var i = 0; i <= 5; i++) {
                var y = padding.top + (i / 5) * chartHeight;
                gridGroup.appendChild(svgEl('line', {
                    x1: padding.left,
                    y1: y,
                    x2: padding.left + chartWidth,
                    y2: y,
                    stroke: 'rgba(255,255,255,0.08)',
                    'stroke-dasharray': '3 3'
                }));
            }
            svg.appendChild(gridGroup);
        }

        // Build path points
        var points = [];
        data.forEach(function(d, i) {
            points.push({
                x: xScale(i),
                y: yScale(d[dataKey] || 0),
                value: d[dataKey] || 0,
                label: d[labelKey] || ''
            });
        });

        var pathD = 'M' + points.map(function(p) { return p.x + ',' + p.y; }).join(' L');

        // Area fill
        if (showArea) {
            var areaD = pathD + 
                ' L' + points[points.length - 1].x + ',' + (padding.top + chartHeight) +
                ' L' + points[0].x + ',' + (padding.top + chartHeight) + ' Z';
            var area = svgEl('path', {
                d: areaD,
                fill: 'url(#' + gradientId + ')',
                class: 'chart-area'
            });
            if (animate) {
                area.style.opacity = '0';
                area.style.transition = 'opacity 0.8s ease';
                setTimeout(function() { area.style.opacity = '1'; }, 50);
            }
            svg.appendChild(area);
        }

        // Line
        var line = svgEl('path', {
            d: pathD,
            fill: 'none',
            stroke: lineColor,
            'stroke-width': 2.5,
            'stroke-linecap': 'round',
            'stroke-linejoin': 'round',
            class: 'chart-line'
        });
        if (animate) {
            var lineLength = line.getTotalLength ? 1000 : 1000;
            line.style.strokeDasharray = lineLength;
            line.style.strokeDashoffset = lineLength;
            line.style.transition = 'stroke-dashoffset 1.5s ease';
        }
        svg.appendChild(line);

        // Animate line
        if (animate) {
            setTimeout(function() {
                line.style.strokeDashoffset = '0';
            }, 100);
        }

        // Dots
        if (showDots && points.length <= 20) {
            var dotsGroup = svgEl('g', { class: 'dots' });
            points.forEach(function(p, i) {
                var dot = svgEl('circle', {
                    cx: p.x,
                    cy: p.y,
                    r: animate ? 0 : 4,
                    fill: lineColor,
                    stroke: '#050810',
                    'stroke-width': 2,
                    class: 'chart-dot',
                    'data-value': p.value,
                    'data-label': p.label
                });
                if (animate) {
                    dot.style.transition = 'r 0.3s ease';
                    setTimeout(function() {
                        dot.setAttribute('r', 4);
                    }, 800 + i * 50);
                }
                dotsGroup.appendChild(dot);
            });
            svg.appendChild(dotsGroup);
        }

        // X-axis labels
        var xLabelsGroup = svgEl('g', { class: 'x-labels' });
        var labelStep = Math.ceil(data.length / 7);
        data.forEach(function(d, i) {
            if (i % labelStep === 0 || i === data.length - 1) {
                xLabelsGroup.appendChild(svgEl('text', {
                    x: xScale(i),
                    y: height - 8,
                    'text-anchor': 'middle',
                    fill: 'rgba(255,255,255,0.5)',
                    'font-size': 10
                }, d[labelKey] || ''));
            }
        });
        svg.appendChild(xLabelsGroup);

        // Y-axis labels
        var yLabelsGroup = svgEl('g', { class: 'y-labels' });
        for (var i = 0; i <= 4; i++) {
            var val = minY + (i / 4) * (maxY - minY);
            yLabelsGroup.appendChild(svgEl('text', {
                x: padding.left - 8,
                y: yScale(val) + 4,
                'text-anchor': 'end',
                fill: 'rgba(255,255,255,0.5)',
                'font-size': 10
            }, Math.round(val).toString()));
        }
        svg.appendChild(yLabelsGroup);

        // Tooltip
        var tooltip = document.createElement('div');
        tooltip.className = 'chart-tooltip';
        tooltip.style.cssText = 'position:absolute;display:none;background:rgba(0,0,0,0.9);border:1px solid ' + lineColor + ';padding:8px 12px;border-radius:6px;font-size:12px;pointer-events:none;z-index:100;';
        container.style.position = 'relative';
        container.appendChild(tooltip);

        // Hover interactions
        svg.addEventListener('mousemove', function(e) {
            var rect = svg.getBoundingClientRect();
            var x = e.clientX - rect.left;
            var index = Math.round((x - padding.left) / chartWidth * (data.length - 1));
            index = Math.max(0, Math.min(data.length - 1, index));
            
            if (points[index]) {
                tooltip.innerHTML = '<strong>' + (data[index][labelKey] || '') + '</strong><br>' + 
                                   '<span style="color:' + lineColor + '">' + points[index].value + '</span>';
                tooltip.style.display = 'block';
                tooltip.style.left = (points[index].x - tooltip.offsetWidth / 2) + 'px';
                tooltip.style.top = (points[index].y - tooltip.offsetHeight - 10) + 'px';
            }
        });

        svg.addEventListener('mouseleave', function() {
            tooltip.style.display = 'none';
        });

        container.appendChild(svg);
    }

    // ========================================================================
    // BAR CHART
    // ========================================================================
    function createBarChart(container, data, options) {
        options = options || {};
        var width = options.width || container.clientWidth || 400;
        var height = options.height || 200;
        var padding = options.padding || { top: 20, right: 20, bottom: 40, left: 60 };
        var horizontal = options.horizontal;
        var animate = options.animate !== false;
        var dataKey = options.dataKey || 'y';
        var labelKey = options.labelKey || 'label';
        var defaultColor = options.color || '#00d4ff';

        container.innerHTML = '';

        if (!data || data.length === 0) {
            container.innerHTML = '<div class="chart-empty">No data available</div>';
            return;
        }

        var chartWidth = width - padding.left - padding.right;
        var chartHeight = height - padding.top - padding.bottom;

        var maxVal = Math.max.apply(null, data.map(function(d) { return d[dataKey] || 0; })) || 1;

        var svg = svgEl('svg', {
            width: width,
            height: height,
            viewBox: '0 0 ' + width + ' ' + height,
            class: 'chart-svg bar-chart'
        });

        // Tooltip
        var tooltip = document.createElement('div');
        tooltip.className = 'chart-tooltip';
        tooltip.style.cssText = 'position:absolute;display:none;background:rgba(0,0,0,0.9);border:1px solid #00d4ff;padding:8px 12px;border-radius:6px;font-size:12px;pointer-events:none;z-index:100;';
        container.style.position = 'relative';

        if (horizontal) {
            var barHeight = (chartHeight / data.length) * 0.65;
            var barGap = (chartHeight / data.length) * 0.35;

            data.forEach(function(d, i) {
                var val = d[dataKey] || 0;
                var targetWidth = (val / maxVal) * chartWidth;
                var y = padding.top + i * (barHeight + barGap);
                var barColor = d.color || defaultColor;

                // Background bar
                svg.appendChild(svgEl('rect', {
                    x: padding.left,
                    y: y,
                    width: chartWidth,
                    height: barHeight,
                    fill: 'rgba(255,255,255,0.05)',
                    rx: 4
                }));

                // Value bar
                var bar = svgEl('rect', {
                    x: padding.left,
                    y: y,
                    width: animate ? 0 : targetWidth,
                    height: barHeight,
                    fill: barColor,
                    rx: 4,
                    class: 'bar',
                    'data-value': val,
                    'data-label': d[labelKey]
                });
                bar.style.transition = 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
                bar.style.cursor = 'pointer';

                if (animate) {
                    setTimeout(function() {
                        bar.setAttribute('width', targetWidth);
                    }, 100 + i * 100);
                }

                // Hover effect
                bar.addEventListener('mouseenter', function(e) {
                    bar.style.filter = 'brightness(1.2)';
                    tooltip.innerHTML = '<strong>' + d[labelKey] + '</strong>: ' + val;
                    tooltip.style.display = 'block';
                    var rect = container.getBoundingClientRect();
                    tooltip.style.left = (e.clientX - rect.left + 10) + 'px';
                    tooltip.style.top = (e.clientY - rect.top - 30) + 'px';
                    tooltip.style.borderColor = barColor;
                });
                bar.addEventListener('mouseleave', function() {
                    bar.style.filter = '';
                    tooltip.style.display = 'none';
                });

                svg.appendChild(bar);

                // Label
                svg.appendChild(svgEl('text', {
                    x: padding.left - 8,
                    y: y + barHeight / 2 + 4,
                    'text-anchor': 'end',
                    fill: 'rgba(255,255,255,0.7)',
                    'font-size': 11
                }, (d[labelKey] || '').substring(0, 12)));

                // Value text
                var valueText = svgEl('text', {
                    x: padding.left + targetWidth + 8,
                    y: y + barHeight / 2 + 4,
                    'text-anchor': 'start',
                    fill: barColor,
                    'font-size': 11,
                    'font-weight': 'bold'
                }, val.toLocaleString());
                if (animate) {
                    valueText.style.opacity = '0';
                    valueText.style.transition = 'opacity 0.3s ease';
                    setTimeout(function() {
                        valueText.style.opacity = '1';
                    }, 600 + i * 100);
                }
                svg.appendChild(valueText);
            });
        } else {
            var barWidth = (chartWidth / data.length) * 0.6;
            var barGap = (chartWidth / data.length) * 0.4;

            data.forEach(function(d, i) {
                var val = d[dataKey] || 0;
                var targetHeight = (val / maxVal) * chartHeight;
                var x = padding.left + i * (barWidth + barGap) + barGap / 2;
                var barColor = d.color || defaultColor;

                var bar = svgEl('rect', {
                    x: x,
                    y: animate ? padding.top + chartHeight : padding.top + chartHeight - targetHeight,
                    width: barWidth,
                    height: animate ? 0 : targetHeight,
                    fill: barColor,
                    rx: 4,
                    class: 'bar'
                });
                bar.style.transition = 'y 0.8s cubic-bezier(0.4, 0, 0.2, 1), height 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
                bar.style.cursor = 'pointer';

                if (animate) {
                    setTimeout(function() {
                        bar.setAttribute('y', padding.top + chartHeight - targetHeight);
                        bar.setAttribute('height', targetHeight);
                    }, 100 + i * 80);
                }

                bar.addEventListener('mouseenter', function() {
                    bar.style.filter = 'brightness(1.2)';
                    tooltip.innerHTML = '<strong>' + d[labelKey] + '</strong>: ' + val;
                    tooltip.style.display = 'block';
                });
                bar.addEventListener('mousemove', function(e) {
                    var rect = container.getBoundingClientRect();
                    tooltip.style.left = (e.clientX - rect.left + 10) + 'px';
                    tooltip.style.top = (e.clientY - rect.top - 30) + 'px';
                });
                bar.addEventListener('mouseleave', function() {
                    bar.style.filter = '';
                    tooltip.style.display = 'none';
                });

                svg.appendChild(bar);

                // Label
                svg.appendChild(svgEl('text', {
                    x: x + barWidth / 2,
                    y: height - 8,
                    'text-anchor': 'middle',
                    fill: 'rgba(255,255,255,0.7)',
                    'font-size': 10
                }, (d[labelKey] || '').substring(0, 8)));
            });
        }

        container.appendChild(svg);
        container.appendChild(tooltip);
    }

    // ========================================================================
    // DONUT CHART
    // ========================================================================
    function createDonutChart(container, data, options) {
        options = options || {};
        var size = options.size || 200;
        var donutWidth = options.donutWidth || 30;
        var animate = options.animate !== false;
        var centerLabel = options.centerLabel;
        var centerValue = options.centerValue;

        container.innerHTML = '';

        if (!data || data.length === 0) {
            container.innerHTML = '<div class="chart-empty">No data available</div>';
            return;
        }

        var wrapper = document.createElement('div');
        wrapper.className = 'donut-wrapper';
        wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:16px;';

        var total = data.reduce(function(sum, d) { return sum + (d.value || 0); }, 0);
        var radius = (size - donutWidth) / 2;
        var innerRadius = radius - donutWidth;
        var centerX = size / 2;
        var centerY = size / 2;

        var svg = svgEl('svg', {
            width: size,
            height: size,
            viewBox: '0 0 ' + size + ' ' + size,
            class: 'chart-svg donut-chart'
        });

        // Tooltip
        var tooltip = document.createElement('div');
        tooltip.className = 'chart-tooltip';
        tooltip.style.cssText = 'position:absolute;display:none;background:rgba(0,0,0,0.9);border:1px solid #00d4ff;padding:8px 12px;border-radius:6px;font-size:12px;pointer-events:none;z-index:100;white-space:nowrap;';

        var currentAngle = -Math.PI / 2;

        data.forEach(function(d, i) {
            var value = d.value || 0;
            var angle = (value / (total || 1)) * Math.PI * 2;
            var startAngle = currentAngle;
            var endAngle = currentAngle + angle;
            currentAngle = endAngle;

            // Create arc path
            var x1 = centerX + Math.cos(startAngle) * radius;
            var y1 = centerY + Math.sin(startAngle) * radius;
            var x2 = centerX + Math.cos(endAngle) * radius;
            var y2 = centerY + Math.sin(endAngle) * radius;
            var x3 = centerX + Math.cos(endAngle) * innerRadius;
            var y3 = centerY + Math.sin(endAngle) * innerRadius;
            var x4 = centerX + Math.cos(startAngle) * innerRadius;
            var y4 = centerY + Math.sin(startAngle) * innerRadius;

            var largeArc = angle > Math.PI ? 1 : 0;
            var pathD = 'M' + x1 + ',' + y1 + 
                        ' A' + radius + ',' + radius + ' 0 ' + largeArc + ' 1 ' + x2 + ',' + y2 +
                        ' L' + x3 + ',' + y3 +
                        ' A' + innerRadius + ',' + innerRadius + ' 0 ' + largeArc + ' 0 ' + x4 + ',' + y4 + ' Z';

            var slice = svgEl('path', {
                d: pathD,
                fill: d.color || '#00d4ff',
                stroke: '#050810',
                'stroke-width': 2,
                class: 'donut-slice',
                'data-name': d.name,
                'data-value': value
            });

            slice.style.cursor = 'pointer';
            slice.style.transition = 'transform 0.3s ease, filter 0.3s ease';
            slice.style.transformOrigin = centerX + 'px ' + centerY + 'px';

            if (animate) {
                slice.style.opacity = '0';
                slice.style.transform = 'scale(0.8)';
                setTimeout(function() {
                    slice.style.opacity = '1';
                    slice.style.transform = 'scale(1)';
                }, 100 + i * 100);
            }

            // Hover
            slice.addEventListener('mouseenter', function(e) {
                slice.style.transform = 'scale(1.05)';
                slice.style.filter = 'brightness(1.2)';
                var pct = Math.round((value / total) * 100);
                tooltip.innerHTML = '<span style="color:' + d.color + '">●</span> ' + d.name + ': <strong>' + value + '</strong> (' + pct + '%)';
                tooltip.style.borderColor = d.color;
                tooltip.style.display = 'block';
            });
            slice.addEventListener('mousemove', function(e) {
                var rect = wrapper.getBoundingClientRect();
                tooltip.style.left = (e.clientX - rect.left + 10) + 'px';
                tooltip.style.top = (e.clientY - rect.top + 10) + 'px';
            });
            slice.addEventListener('mouseleave', function() {
                slice.style.transform = 'scale(1)';
                slice.style.filter = '';
                tooltip.style.display = 'none';
            });

            svg.appendChild(slice);
        });

        // Center text
        if (centerValue !== undefined) {
            svg.appendChild(svgEl('text', {
                x: centerX,
                y: centerY - 2,
                'text-anchor': 'middle',
                fill: '#fff',
                'font-size': 22,
                'font-weight': 'bold'
            }, String(centerValue)));
        }
        if (centerLabel) {
            svg.appendChild(svgEl('text', {
                x: centerX,
                y: centerY + 18,
                'text-anchor': 'middle',
                fill: 'rgba(255,255,255,0.6)',
                'font-size': 11
            }, centerLabel));
        }

        wrapper.appendChild(svg);

        // Legend
        var legend = document.createElement('div');
        legend.className = 'donut-legend';
        legend.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;justify-content:center;';

        data.forEach(function(d) {
            var item = document.createElement('div');
            item.className = 'legend-item';
            item.style.cssText = 'display:flex;align-items:center;gap:6px;padding:4px 10px;background:rgba(255,255,255,0.05);border-radius:6px;font-size:12px;cursor:pointer;transition:all 0.2s;';

            var colorDot = document.createElement('span');
            colorDot.style.cssText = 'width:10px;height:10px;border-radius:3px;background:' + (d.color || '#00d4ff') + ';';

            var label = document.createElement('span');
            label.style.color = 'rgba(255,255,255,0.7)';
            label.textContent = d.name;

            var value = document.createElement('span');
            value.style.cssText = 'font-weight:bold;color:#fff;';
            value.textContent = Math.round((d.value / total) * 100) + '%';

            item.appendChild(colorDot);
            item.appendChild(label);
            item.appendChild(value);

            item.addEventListener('mouseenter', function() {
                item.style.background = 'rgba(255,255,255,0.1)';
            });
            item.addEventListener('mouseleave', function() {
                item.style.background = 'rgba(255,255,255,0.05)';
            });

            legend.appendChild(item);
        });

        wrapper.appendChild(legend);
        wrapper.style.position = 'relative';
        wrapper.appendChild(tooltip);
        container.appendChild(wrapper);
    }

    // ========================================================================
    // CIRCULAR PROGRESS
    // ========================================================================
    function createCircularProgress(container, value, options) {
        options = options || {};
        var size = options.size || 120;
        var strokeWidth = options.strokeWidth || 10;
        var color = options.color || '#00d4ff';
        var max = options.max || 100;
        var label = options.label;
        var animate = options.animate !== false;

        container.innerHTML = '';

        var wrapper = document.createElement('div');
        wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:8px;';

        var radius = (size - strokeWidth) / 2;
        var circumference = 2 * Math.PI * radius;
        var progress = (value / max) * circumference;
        var offset = circumference - progress;

        var svg = svgEl('svg', {
            width: size,
            height: size,
            viewBox: '0 0 ' + size + ' ' + size,
            class: 'circular-progress-svg'
        });

        // Background circle
        svg.appendChild(svgEl('circle', {
            cx: size / 2,
            cy: size / 2,
            r: radius,
            fill: 'none',
            stroke: 'rgba(255,255,255,0.1)',
            'stroke-width': strokeWidth
        }));

        // Progress circle
        var progressCircle = svgEl('circle', {
            cx: size / 2,
            cy: size / 2,
            r: radius,
            fill: 'none',
            stroke: color,
            'stroke-width': strokeWidth,
            'stroke-linecap': 'round',
            'stroke-dasharray': circumference,
            'stroke-dashoffset': animate ? circumference : offset,
            transform: 'rotate(-90 ' + (size/2) + ' ' + (size/2) + ')'
        });
        progressCircle.style.transition = 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)';
        
        if (animate) {
            setTimeout(function() {
                progressCircle.setAttribute('stroke-dashoffset', offset);
            }, 100);
        }

        svg.appendChild(progressCircle);

        // Center value
        svg.appendChild(svgEl('text', {
            x: size / 2,
            y: size / 2 + 6,
            'text-anchor': 'middle',
            fill: '#fff',
            'font-size': size * 0.22,
            'font-weight': 'bold'
        }, Math.round(value).toString()));

        wrapper.appendChild(svg);

        if (label) {
            var labelEl = document.createElement('div');
            labelEl.style.cssText = 'font-size:12px;color:rgba(255,255,255,0.6);';
            labelEl.textContent = label;
            wrapper.appendChild(labelEl);
        }

        container.appendChild(wrapper);
    }

    // ========================================================================
    // SPARKLINE
    // ========================================================================
    function createSparkline(container, data, options) {
        options = options || {};
        var width = options.width || 100;
        var height = options.height || 30;
        var color = options.color || '#00d4ff';
        var showArea = options.showArea !== false;

        container.innerHTML = '';

        if (!data || data.length < 2) {
            return;
        }

        var min = Math.min.apply(null, data);
        var max = Math.max.apply(null, data);
        var range = max - min || 1;

        var points = data.map(function(v, i) {
            var x = (i / (data.length - 1)) * width;
            var y = height - 2 - ((v - min) / range) * (height - 4);
            return x + ',' + y;
        }).join(' L');

        var pathD = 'M' + points;
        var areaD = pathD + ' L' + width + ',' + height + ' L0,' + height + ' Z';

        var svg = svgEl('svg', { width: width, height: height, class: 'sparkline' });

        if (showArea) {
            var gradId = 'spark-' + Math.random().toString(36).substr(2, 5);
            var defs = svgEl('defs');
            var grad = svgEl('linearGradient', { id: gradId, x1: '0%', y1: '0%', x2: '0%', y2: '100%' });
            grad.appendChild(svgEl('stop', { offset: '0%', 'stop-color': color, 'stop-opacity': '0.3' }));
            grad.appendChild(svgEl('stop', { offset: '100%', 'stop-color': color, 'stop-opacity': '0' }));
            defs.appendChild(grad);
            svg.appendChild(defs);
            svg.appendChild(svgEl('path', { d: areaD, fill: 'url(#' + gradId + ')' }));
        }

        svg.appendChild(svgEl('path', {
            d: pathD,
            fill: 'none',
            stroke: color,
            'stroke-width': 2,
            'stroke-linecap': 'round'
        }));

        container.appendChild(svg);
    }

    // ========================================================================
    // PROGRESS BAR
    // ========================================================================
    function createProgressBar(container, value, options) {
        options = options || {};
        var max = options.max || 100;
        var color = options.color || '#00d4ff';
        var height = options.height || 8;
        var label = options.label;
        var showValue = options.showValue !== false;
        var animate = options.animate !== false;

        container.innerHTML = '';

        var pct = Math.min((value / max) * 100, 100);

        var wrapper = document.createElement('div');
        wrapper.className = 'progress-bar-wrapper';

        if (label || showValue) {
            var header = document.createElement('div');
            header.style.cssText = 'display:flex;justify-content:space-between;margin-bottom:6px;font-size:12px;';

            if (label) {
                var labelEl = document.createElement('span');
                labelEl.style.color = 'rgba(255,255,255,0.7)';
                labelEl.textContent = label;
                header.appendChild(labelEl);
            }

            if (showValue) {
                var valueEl = document.createElement('span');
                valueEl.style.cssText = 'font-weight:bold;color:' + color + ';';
                valueEl.textContent = Math.round(pct) + '%';
                header.appendChild(valueEl);
            }

            wrapper.appendChild(header);
        }

        var track = document.createElement('div');
        track.style.cssText = 'width:100%;height:' + height + 'px;background:rgba(255,255,255,0.1);border-radius:' + (height/2) + 'px;overflow:hidden;';

        var fill = document.createElement('div');
        fill.style.cssText = 'width:' + (animate ? 0 : pct) + '%;height:100%;background:' + color + ';border-radius:' + (height/2) + 'px;transition:width 0.8s cubic-bezier(0.4, 0, 0.2, 1);position:relative;';

        // Shine animation
        var shine = document.createElement('div');
        shine.style.cssText = 'position:absolute;top:0;left:0;right:0;height:50%;background:linear-gradient(180deg,rgba(255,255,255,0.3),transparent);border-radius:' + (height/2) + 'px ' + (height/2) + 'px 0 0;';
        fill.appendChild(shine);

        track.appendChild(fill);
        wrapper.appendChild(track);
        container.appendChild(wrapper);

        if (animate) {
            setTimeout(function() {
                fill.style.width = pct + '%';
            }, 50);
        }
    }

    // Export
    global.Charts = {
        line: createLineChart,
        bar: createBarChart,
        donut: createDonutChart,
        circular: createCircularProgress,
        sparkline: createSparkline,
        progress: createProgressBar
    };

})(window);
