# 📋 Pull Request: [Brief Description]

## 🎯 **Change Summary**
**Type**: [feat/fix/docs/refactor/chore]  
**Impact Level**: [Low/Medium/High]  
**Breaking Changes**: [Yes/No]  

**Brief Description**:
[Explain what was changed and why]

---

## 📚 **Documentation Checklist** (Required for ALL PRs)

### ✅ **Mandatory Updates**
- [ ] **CHANGELOG.md** - Added entry to [Unreleased] section
- [ ] **docs/LATEST_CHANGES.md** - Updated recent changes and current status
- [ ] **Impact Assessment** - Evaluated and documented below

### ✅ **Feature-Specific Updates** (if applicable)
- [ ] **API Documentation** - Updated for any API changes
- [ ] **Component Documentation** - Updated for any UI component changes  
- [ ] **Setup/Deployment Docs** - Updated for any configuration changes
- [ ] **Developer Guide** - Updated for any workflow changes

### ✅ **Documentation Index** (if applicable)
- [ ] **docs/DOCUMENTATION_INDEX.md** - Updated if new docs were added
- [ ] **README.md** - Updated if major changes affect quick start

---

## 🔄 **Impact Assessment**

### **Systems Affected**
- [ ] Order Management
- [ ] Employee Management  
- [ ] Delivery Zones
- [ ] Inventory Management
- [ ] Store Management
- [ ] Authentication
- [ ] UI Components
- [ ] Development Workflow
- [ ] Deployment Process

### **Dependencies Changed**
- [ ] No dependency changes
- [ ] New dependencies added: [List]
- [ ] Dependencies updated: [List] 
- [ ] Dependencies removed: [List]

### **Migration Required**
- [ ] No migration needed
- [ ] Database migration required: [Description]
- [ ] Configuration migration required: [Description]
- [ ] Code migration required: [Description]

---

## 🧪 **Testing Completed**

### **Code Quality**
- [ ] **TypeScript** - No compilation errors
- [ ] **ESLint** - No linting errors  
- [ ] **Build** - Production build successful
- [ ] **Unit Tests** - All tests pass
- [ ] **Integration Tests** - Relevant tests pass

### **Manual Testing**
- [ ] **Feature Testing** - New functionality works as expected
- [ ] **Regression Testing** - Existing functionality unaffected
- [ ] **Cross-Browser** - Tested in Chrome, Safari, Firefox (if UI changes)
- [ ] **Mobile Responsive** - Works on mobile devices (if UI changes)

---

## 🚀 **Deployment Considerations**

### **Environment Variables**
- [ ] No new environment variables
- [ ] New environment variables required: [List with descriptions]

### **Configuration Changes**  
- [ ] No configuration changes
- [ ] Configuration changes required: [Description]

### **Special Deployment Notes**
- [ ] No special requirements
- [ ] Special deployment steps required: [Description]

---

## 📋 **CHANGELOG.md Entry**
**Copy this entry to CHANGELOG.md [Unreleased] section:**

```markdown
### [Added/Changed/Fixed/Removed]
- [Description of change]: Brief explanation of what was modified and why
```

---

## 📝 **Additional Notes**

### **Breaking Changes Details** (if any)
[Describe any breaking changes and migration path]

### **Performance Impact**
[Note any performance improvements or potential impacts]

### **Security Considerations**  
[Note any security-related changes or considerations]

### **Future Work**
[Note any follow-up work or related issues]

---

## 🔗 **Related Issues**
- Closes #[issue-number]
- Related to #[issue-number]
- Follows up on #[issue-number]

---

## 👥 **Review Notes**
**Reviewer Checklist:**
- [ ] Documentation updates are complete and accurate
- [ ] CHANGELOG.md entry is clear and properly categorized
- [ ] LATEST_CHANGES.md reflects current status
- [ ] Code changes align with documented patterns
- [ ] No documentation debt introduced

**Special Review Areas:**
[Note any areas that need special attention during review]

---

**🚨 This PR cannot be merged until all documentation checklist items are completed and the CHANGELOG.md is updated.**
