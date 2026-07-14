const fs = require('fs');
const path = require('path');
const ignore = require('ignore');

class ProjectScanner {
  constructor() {
    this.commonIgnorePatterns = [
      'node_modules', '.git', '.vscode', '.idea', 'dist', 'build', 'out', '.next', '.cache',
      '__pycache__', 'venv', '.env'
    ];
  }

  /**
   * Main entry point to scan a project folder
   */
  async scanProject(projectPath) {
    if (!fs.existsSync(projectPath)) {
      throw new Error("Project path does not exist");
    }

    const ig = this.buildIgnoreFilter(projectPath);
    const allFiles = this.walkDir(projectPath, projectPath, ig);
    
    // Analyze tech stack
    const { language, framework } = this.detectTechStack(projectPath, allFiles);
    
    return {
      totalFiles: allFiles.length,
      language,
      framework,
      files: allFiles
    };
  }

  buildIgnoreFilter(projectPath) {
    const ig = ignore().add(this.commonIgnorePatterns);
    const gitignorePath = path.join(projectPath, '.gitignore');
    
    if (fs.existsSync(gitignorePath)) {
      const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
      ig.add(gitignoreContent);
    }
    return ig;
  }

  walkDir(dir, baseDir, ig, fileList = []) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const relativePath = path.relative(baseDir, filePath);
      
      // Use ignore filter (convert backslashes for ignore module)
      if (ig.ignores(relativePath.replace(/\\/g, '/'))) {
        continue;
      }

      if (fs.statSync(filePath).isDirectory()) {
        this.walkDir(filePath, baseDir, ig, fileList);
      } else {
        fileList.push(relativePath);
      }
    }
    return fileList;
  }

  detectTechStack(projectPath, files) {
    let language = 'Unknown';
    let framework = 'None';

    // Check Javascript/Typescript
    if (files.includes('package.json')) {
      language = 'JavaScript';
      const pkgRaw = fs.readFileSync(path.join(projectPath, 'package.json'), 'utf8');
      try {
        const pkg = JSON.parse(pkgRaw);
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        
        if (deps.typescript) language = 'TypeScript';
        if (deps.react) framework = 'React';
        if (deps.vue) framework = 'Vue';
        if (deps.next) framework = 'Next.js';
        if (deps.express) framework = 'Express';
      } catch (e) { /* ignore parse errors */ }
    } 
    // Check Python
    else if (files.includes('requirements.txt') || files.includes('pyproject.toml') || files.includes('Pipfile')) {
      language = 'Python';
      if (files.some(f => f.includes('manage.py'))) framework = 'Django';
      else if (files.some(f => f.includes('app.py') || f.includes('main.py'))) framework = 'Flask/FastAPI';
    }
    // Check Go
    else if (files.includes('go.mod')) {
      language = 'Go';
    }
    // Check Java
    else if (files.includes('pom.xml') || files.includes('build.gradle')) {
      language = 'Java';
      if (files.includes('pom.xml')) {
        const pom = fs.readFileSync(path.join(projectPath, 'pom.xml'), 'utf8');
        if (pom.includes('spring-boot')) framework = 'Spring Boot';
      }
    }

    return { language, framework };
  }
}

module.exports = new ProjectScanner();
