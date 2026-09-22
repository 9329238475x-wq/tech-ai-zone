class InfographicEngine {
  generateOriginalValueLayer(tableData, category) {
    if (!tableData || !tableData.headers || !tableData.rows) {
      // Generate standard comparison matrix based on category
      return this.generateDefaultMatrix(category);
    }

    const { title, headers, rows } = tableData;

    let html = `
      <div class="original-value-container">
        <div class="infographic-badge">
          <span class="badge-icon">📊</span>
          <strong>Original Research Matrix: ${title || 'Technical & Benchmark Comparison'}</strong>
        </div>
        <div class="table-responsive">
          <table class="tech-comparison-table">
            <thead>
              <tr>
                ${headers.map(h => `<th>${h}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${rows.map(r => `
                <tr>
                  ${r.map((cell, idx) => idx === 0 ? `<td><strong>${cell}</strong></td>` : `<td>${cell}</td>`).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <div class="infographic-footer">
          <small>Source: Tech AI Zone Independent Analysis & Verified Benchmark Synthesis</small>
        </div>
      </div>
    `;

    return html;
  }

  generateDefaultMatrix(category) {
    return `
      <div class="original-value-container">
        <div class="infographic-badge">
          <span class="badge-icon">⚡</span>
          <strong>Tech AI Zone Specification & Trade-Off Matrix</strong>
        </div>
        <div class="table-responsive">
          <table class="tech-comparison-table">
            <thead>
              <tr>
                <th>Evaluation Dimension</th>
                <th>Current Breakthrough</th>
                <th>Industry Baseline</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Compute & Latency</strong></td>
                <td>Optimized low-overhead architecture</td>
                <td>Standard floating-point cluster latency</td>
              </tr>
              <tr>
                <td><strong>Accessibility & Licensing</strong></td>
                <td>Immediate developer access / API</td>
                <td>Restricted preview or closed beta</td>
              </tr>
              <tr>
                <td><strong>Production Readiness</strong></td>
                <td>Enterprise verified benchmarks</td>
                <td>Experimental research baseline</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
}

module.exports = new InfographicEngine();
